<?php

namespace App\Controller\Api;

use App\Entity\Board;
use App\Entity\BoardColumn;
use App\Entity\Notification;
use App\Entity\Task;
use App\Entity\TaskComment;
use App\Entity\TaskLabel;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/public/board')]
class PublicBoardController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    private function findByToken(string $token): ?Board
    {
        $board = $this->em->getRepository(Board::class)->findOneBy(['shareToken' => $token]);
        if (!$board || !$board->isShareEnabled()) return null;
        return $board;
    }

    #[Route('/{token}', name: 'api_public_board_show', methods: ['GET'])]
    public function show(string $token): JsonResponse
    {
        $board = $this->findByToken($token);
        if (!$board) return $this->json(['message' => 'Tableau non disponible.'], 404);

        $data = [
            'id'          => $board->getId(),
            'nom'         => $board->getNom(),
            'couleurFond' => $board->getCouleurFond() ?? '#0052CC',
            'agence'      => 'Encore Design',
            'columns'     => [],
        ];

        foreach ($board->getColumns() as $col) {
            $tasks = [];
            foreach ($col->getTasks() as $task) {
                $checklist = [];
                foreach ($task->getChecklistItems() as $item) {
                    $checklist[] = ['id' => $item->getId(), 'texte' => $item->getTexte(), 'checked' => $item->isChecked()];
                }
                $comments = [];
                foreach ($task->getComments() as $c) {
                    $comments[] = $c->toArray();
                }
                $attachments = [];
                foreach ($task->getAttachments() as $a) {
                    $attachments[] = $a->toArray();
                }
                $tasks[] = [
                    'id'              => $task->getId(),
                    'titre'           => $task->getTitre(),
                    'description'     => $task->getDescription(),
                    'couleur'         => $task->getCouleur(),
                    'dateEcheance'    => $task->getDateEcheance()?->format('Y-m-d'),
                    'jalon'           => $task->getJalon(),
                    'clientValidated' => $task->isClientValidated(),
                    'clientValidatedAt' => $task->getClientValidatedAt()?->format(\DateTimeInterface::ATOM),
                    'labels'          => $task->getLabels()->map(fn(TaskLabel $l) => $l->toArray())->toArray(),
                    'checklist'       => $checklist,
                    'checklistMeta'   => [
                        'total' => count($checklist),
                        'done'  => count(array_filter($checklist, fn($i) => $i['checked'])),
                    ],
                    'comments'        => $comments,
                    'attachments'     => $attachments,
                ];
            }
            $data['columns'][] = [
                'id'     => $col->getId(),
                'nom'    => $col->getNom(),
                'couleur'=> $col->getCouleur(),
                'tasks'  => $tasks,
            ];
        }

        return $this->json($data);
    }

    #[Route('/{token}/tasks/{taskId}/comments', name: 'api_public_board_comment', methods: ['POST'])]
    public function addClientComment(string $token, int $taskId, Request $request): JsonResponse
    {
        $board = $this->findByToken($token);
        if (!$board) return $this->json(['message' => 'Tableau non disponible.'], 404);

        $task = $this->em->getRepository(Task::class)->find($taskId);
        if (!$task || $task->getColumn()?->getBoard() !== $board) {
            return $this->json(['message' => 'Tâche introuvable.'], 404);
        }

        $data    = json_decode($request->getContent(), true) ?? [];
        $texte   = trim($data['texte'] ?? '');
        $auteur  = trim($data['auteurNom'] ?? 'Client');

        if (!$texte) return $this->json(['message' => 'Commentaire vide.'], 422);
        if (strlen($texte) > 2000) return $this->json(['message' => 'Commentaire trop long.'], 422);
        if (strlen($auteur) > 100) $auteur = mb_substr($auteur, 0, 100);

        $comment = (new TaskComment())
            ->setTask($task)
            ->setAuteurNom($auteur)
            ->setTexte($texte)
            ->setIsClientComment(true);

        $this->em->persist($comment);

        // Notify board owner + task assignees
        $toNotify = [];
        $toNotify[$board->getProprietaire()->getId()] = $board->getProprietaire();
        foreach ($board->getMembers() as $m) {
            $u = $m->getUser();
            if ($u) $toNotify[$u->getId()] = $u;
        }
        foreach ($task->getAssignees() as $assignee) {
            $toNotify[$assignee->getId()] = $assignee;
        }

        foreach ($toNotify as $recipient) {
            $notif = (new Notification())
                ->setDestinataire($recipient)
                ->setType('client_comment')
                ->setTitre("{$auteur} (client) a commenté une tâche")
                ->setContenu("« {$task->getTitre()} » : " . mb_substr($texte, 0, 100))
                ->setLienUrl('/todos/' . $board->getId());
            $this->em->persist($notif);
        }

        $task->setUpdatedAt(new \DateTimeImmutable());
        $this->em->flush();
        return $this->json($comment->toArray(), 201);
    }

    #[Route('/{token}/tasks/{taskId}/validate', name: 'api_public_board_validate', methods: ['POST'])]
    public function validateTask(string $token, int $taskId, Request $request): JsonResponse
    {
        $board = $this->findByToken($token);
        if (!$board) return $this->json(['message' => 'Tableau non disponible.'], 404);

        $task = $this->em->getRepository(Task::class)->find($taskId);
        if (!$task || $task->getColumn()?->getBoard() !== $board) {
            return $this->json(['message' => 'Tâche introuvable.'], 404);
        }

        $data  = json_decode($request->getContent(), true) ?? [];
        $auteur = trim($data['auteurNom'] ?? 'Client');

        $task->setClientValidated(true);
        $task->setClientValidatedAt(new \DateTimeImmutable());
        $task->setUpdatedAt(new \DateTimeImmutable());

        // Notify board owner + assignees
        $toNotify = [];
        $toNotify[$board->getProprietaire()->getId()] = $board->getProprietaire();
        foreach ($task->getAssignees() as $assignee) {
            $toNotify[$assignee->getId()] = $assignee;
        }
        foreach ($board->getMembers() as $m) {
            $u = $m->getUser();
            if ($u) $toNotify[$u->getId()] = $u;
        }

        foreach ($toNotify as $recipient) {
            $notif = (new Notification())
                ->setDestinataire($recipient)
                ->setType('client_validated')
                ->setTitre("{$auteur} a validé une tâche ✓")
                ->setContenu("La tâche « {$task->getTitre()} » a été validée par le client.")
                ->setLienUrl('/todos/' . $board->getId());
            $this->em->persist($notif);
        }

        $this->em->flush();
        return $this->json([
            'clientValidated'   => true,
            'clientValidatedAt' => $task->getClientValidatedAt()?->format(\DateTimeInterface::ATOM),
        ]);
    }

    #[Route('/{token}/tasks/{taskId}/validate', name: 'api_public_board_unvalidate', methods: ['DELETE'])]
    public function unvalidateTask(string $token, int $taskId): JsonResponse
    {
        $board = $this->findByToken($token);
        if (!$board) return $this->json(['message' => 'Tableau non disponible.'], 404);

        $task = $this->em->getRepository(Task::class)->find($taskId);
        if (!$task || $task->getColumn()?->getBoard() !== $board) {
            return $this->json(['message' => 'Tâche introuvable.'], 404);
        }

        $task->setClientValidated(false);
        $task->setClientValidatedAt(null);
        $task->setUpdatedAt(new \DateTimeImmutable());
        $this->em->flush();

        return $this->json(['clientValidated' => false]);
    }
}
