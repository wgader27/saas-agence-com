<?php

namespace App\Controller\Api;

use App\Entity\Board;
use App\Entity\Client;
use App\Entity\Note;
use App\Entity\SiteAccess;
use App\Service\EncryptionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/ai')]
#[IsGranted('ROLE_EMPLOYEE')]
class AiController extends AbstractController
{
    private const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    public function __construct(
        private readonly string $geminiApiKey,
        private readonly EntityManagerInterface $em,
        private readonly EncryptionService $encryption,
    ) {}

    /**
     * Free-form Gemini chat — used by the /ia page.
     * Contract: POST {messages:[{role,content}]} → {content:""}
     */
    #[Route('/chat', name: 'api_ai_chat', methods: ['POST'])]
    public function chat(Request $request): JsonResponse
    {
        $data     = json_decode($request->getContent(), true) ?? [];
        $messages = $data['messages'] ?? [];

        if (empty($messages)) {
            return $this->json(['message' => 'Messages requis.'], 422);
        }

        $contents = $this->convertToGeminiContents($messages);

        return $this->callGemini($contents);
    }

    /**
     * App-aware assistant — used by the floating bubble.
     * Injects live DB context (clients, notes, accesses) as system instruction.
     * Contract: POST {message:"..."} → {content:""}
     */
    #[Route('/ask', name: 'api_ai_ask', methods: ['POST'])]
    public function ask(Request $request): JsonResponse
    {
        $data    = json_decode($request->getContent(), true) ?? [];
        $message = trim($data['message'] ?? '');

        if ($message === '') {
            return $this->json(['message' => 'Message requis.'], 422);
        }

        $systemPrompt = $this->buildAppContext();

        $payload = [
            'systemInstruction' => [
                'parts' => [['text' => $systemPrompt]],
            ],
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => $message]]],
            ],
            'generationConfig' => [
                'temperature'     => 0.3,
                'maxOutputTokens' => 1024,
            ],
        ];

        return $this->callGeminiRaw($payload);
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private function convertToGeminiContents(array $messages): array
    {
        return array_map(function (array $msg) {
            return [
                'role'  => $msg['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $msg['content']]],
            ];
        }, $messages);
    }

    private function callGemini(array $contents, array $extra = []): JsonResponse
    {
        $payload = array_merge([
            'contents'         => $contents,
            'generationConfig' => [
                'temperature'     => 0.7,
                'maxOutputTokens' => 2048,
            ],
        ], $extra);

        return $this->callGeminiRaw($payload);
    }

    private function callGeminiRaw(array $payload): JsonResponse
    {
        $url = self::GEMINI_URL . '?key=' . urlencode($this->geminiApiKey);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => 60,
            // CA bundle absent on Windows dev — désactiver vérification SSL
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $httpCode >= 500) {
            return $this->json(['message' => 'Erreur du service IA.'], 502);
        }

        $decoded = json_decode($response, true);

        if ($httpCode !== 200) {
            $errMsg = $decoded['error']['message'] ?? 'Erreur Gemini.';
            return $this->json(['message' => $errMsg], $httpCode >= 400 ? $httpCode : 502);
        }

        $text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';

        return $this->json(['content' => $text]);
    }

    private function buildAppContext(): string
    {
        $clients   = $this->em->getRepository(Client::class)->findAll();
        $notes     = $this->em->getRepository(Note::class)->findBy(['visibilite' => 'equipe'], ['updatedAt' => 'DESC'], 20);
        $accesses  = $this->em->getRepository(SiteAccess::class)->findAll();

        $clientLines = [];
        foreach ($clients as $client) {
            $line = "- [{$client->getId()}] {$client->getNom()}";
            if ($client->getSecteur())   $line .= " | Secteur: {$client->getSecteur()}";
            if ($client->getContact())   $line .= " | Contact: {$client->getContact()}";
            if ($client->getTelephone()) $line .= " | Tél: {$client->getTelephone()}";
            if ($client->getEmail())     $line .= " | Email: {$client->getEmail()}";
            $clientLines[] = $line;
        }

        $accessLines = [];
        foreach ($accesses as $access) {
            $clientNom = $access->getClient()?->getNom() ?? 'Inconnu';
            $login    = $access->getLogin()    ? $this->encryption->decrypt($access->getLogin())    : '';
            $password = $access->getPassword() ? $this->encryption->decrypt($access->getPassword()) : '';
            $line  = "- [{$clientNom}] {$access->getLabel()} | Type: {$access->getType()} | URL: {$access->getUrl()} | Login: {$login} | Mot de passe: {$password}";
            if ($access->getNotes()) $line .= " | Notes: {$access->getNotes()}";
            $accessLines[] = $line;
        }

        $noteLines = [];
        foreach ($notes as $note) {
            $contenu = strip_tags($note->getContenu() ?? '');
            $excerpt = mb_substr($contenu, 0, 200) . (mb_strlen($contenu) > 200 ? '…' : '');
            $noteLines[] = "- [{$note->getTitre()}] par {$note->getAuteur()?->getPrenom()} : {$excerpt}";
        }

        // Boards / Kanban
        $boards = $this->em->getRepository(Board::class)->findAll();
        $boardLines = [];
        foreach ($boards as $board) {
            $visLabel = $board->getVisibilite();
            $owner    = $board->getProprietaire()?->getPrenom() . ' ' . $board->getProprietaire()?->getNom();
            $line = "Tableau: «{$board->getNom()}» (visibilité: {$visLabel}, propriétaire: {$owner})";
            foreach ($board->getColumns() as $col) {
                $tasks = $col->getTasks();
                if ($tasks->isEmpty()) continue;
                $line .= "\n  Colonne: {$col->getNom()}";
                foreach ($tasks as $task) {
                    $tl = "\n    - {$task->getTitre()}";
                    if ($task->getDateEcheance()) {
                        $tl .= ' [échéance: ' . $task->getDateEcheance()->format('d/m/Y') . ']';
                    }
                    if ($task->getJalon()) {
                        $tl .= " [jalon: {$task->getJalon()}]";
                    }
                    $assignees = $task->getAssignees();
                    if (!$assignees->isEmpty()) {
                        $names = array_map(fn($u) => $u->getPrenom(), $assignees->toArray());
                        $tl .= ' [assigné à: ' . implode(', ', $names) . ']';
                    }
                    $cl = $task->getChecklistItems();
                    if (!$cl->isEmpty()) {
                        $done  = $cl->filter(fn($i) => $i->isChecked())->count();
                        $total = $cl->count();
                        $tl .= " [checklist: {$done}/{$total}]";
                    }
                    $line .= $tl;
                }
            }
            $boardLines[] = $line;
        }

        $clientsSection  = $clientLines  ? implode("\n", $clientLines)  : 'Aucun client.';
        $accessesSection = $accessLines  ? implode("\n", $accessLines)  : 'Aucun accès.';
        $notesSection    = $noteLines    ? implode("\n", $noteLines)    : 'Aucune note partagée.';
        $boardsSection   = $boardLines   ? implode("\n", $boardLines)   : 'Aucun tableau.';

        return <<<PROMPT
Tu es l'assistant interne de l'agence Encore Design. Tu as accès aux données en temps réel de l'outil de gestion.
Réponds de façon concise et utile. Si une information n'est pas dans les données ci-dessous, dis-le clairement.
Ne génère JAMAIS de mots de passe ou d'informations sensibles que tu n'aurais pas reçues ci-dessous.

=== CLIENTS ===
{$clientsSection}

=== ACCÈS SITES ===
{$accessesSection}

=== NOTES D'ÉQUIPE (20 dernières) ===
{$notesSection}

=== TABLEAUX KANBAN ===
{$boardsSection}
PROMPT;
    }
}
