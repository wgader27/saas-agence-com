<?php

namespace App\Controller\Api;

use App\Entity\Board;
use App\Entity\BoardColumn;
use App\Entity\BoardMember;
use App\Entity\Client;
use App\Entity\Notification;
use App\Entity\Task;
use App\Entity\TaskAttachment;
use App\Entity\TaskChecklistItem;
use App\Entity\TaskComment;
use App\Entity\TaskLabel;
use App\Entity\User;
use App\Entity\Workspace;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/boards')]
#[IsGranted('ROLE_EMPLOYEE')]
class BoardController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    // ─── Boards ─────────────────────────────────────────────────────────────

    #[Route('', name: 'api_boards_list', methods: ['GET'])]
    public function list(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $workspaceId = $request->query->get('workspaceId');

        $qb = $this->em->getRepository(Board::class)->createQueryBuilder('b')
            ->leftJoin('b.members', 'm')
            ->where('b.proprietaire = :u OR m.user = :u OR b.visibilite = :equipe')
            ->setParameter('u', $user)
            ->setParameter('equipe', 'equipe')
            ->orderBy('b.createdAt', 'DESC');

        if ($workspaceId !== null) {
            if ($workspaceId === 'personal') {
                $qb->andWhere('b.workspace IS NULL AND b.proprietaire = :owner')
                   ->setParameter('owner', $user);
            } else {
                $qb->andWhere('b.workspace = :ws')
                   ->setParameter('ws', (int) $workspaceId);
            }
        }

        $boards = $qb->getQuery()->getResult();
        return $this->json(array_map(fn(Board $b) => $b->toArray(), $boards));
    }

    #[Route('', name: 'api_boards_create', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $board = new Board();
        $board->setNom($data['nom'] ?? 'Nouveau tableau');
        $board->setDescription($data['description'] ?? null);
        $board->setVisibilite($data['visibilite'] ?? 'equipe');
        $board->setCouleurFond($data['couleurFond'] ?? '#0052CC');
        $board->setProprietaire($user);

        if (!empty($data['workspaceId'])) {
            $ws = $this->em->getRepository(Workspace::class)->find($data['workspaceId']);
            if ($ws) $board->setWorkspace($ws);
        }

        if (!empty($data['clientId'])) {
            $client = $this->em->getRepository(Client::class)->find($data['clientId']);
            if ($client) $board->setClientAssocie($client);
        }

        foreach ([['À faire', 0], ['En cours', 1], ['Terminé', 2]] as [$nom, $ordre]) {
            $col = (new BoardColumn())->setBoard($board)->setNom($nom)->setOrdre($ordre);
            $this->em->persist($col);
        }

        $this->em->persist($board);
        $this->em->flush();

        return $this->json($this->boardDetail($board), 201);
    }

    #[Route('/{id}', name: 'api_boards_show', methods: ['GET'])]
    public function show(int $id, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($id, $user);
        if (!$board) return $this->json(['message' => 'Tableau introuvable.'], 404);
        return $this->json($this->boardDetail($board));
    }

    #[Route('/{id}', name: 'api_boards_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findOwnerOrAdmin($id, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['nom']))          $board->setNom($data['nom']);
        if (isset($data['description']))  $board->setDescription($data['description']);
        if (isset($data['visibilite']))   $board->setVisibilite($data['visibilite']);
        if (isset($data['couleurFond']))  $board->setCouleurFond($data['couleurFond']);

        if (array_key_exists('workspaceId', $data)) {
            if ($data['workspaceId']) {
                $ws = $this->em->getRepository(Workspace::class)->find($data['workspaceId']);
                $board->setWorkspace($ws ?? null);
            } else {
                $board->setWorkspace(null);
            }
        }

        if (array_key_exists('clientId', $data)) {
            if ($data['clientId']) {
                $client = $this->em->getRepository(Client::class)->find($data['clientId']);
                $board->setClientAssocie($client ?? null);
            } else {
                $board->setClientAssocie(null);
            }
        }

        $this->em->flush();
        return $this->json($board->toArray());
    }

    #[Route('/{id}', name: 'api_boards_delete', methods: ['DELETE'])]
    public function delete(int $id, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findOwnerOrAdmin($id, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $this->em->remove($board);
        $this->em->flush();
        return $this->json(null, 204);
    }

    // ─── Share link ──────────────────────────────────────────────────────────

    #[Route('/{id}/share', name: 'api_boards_share_toggle', methods: ['POST'])]
    public function toggleShare(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findOwnerOrAdmin($id, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $data = json_decode($request->getContent(), true) ?? [];
        $enable = $data['enabled'] ?? !$board->isShareEnabled();

        if ($enable && !$board->getShareToken()) {
            $board->generateShareToken();
        }
        $board->setShareEnabled((bool) $enable);

        $this->em->flush();
        return $this->json([
            'shareEnabled' => $board->isShareEnabled(),
            'shareToken'   => $board->isShareEnabled() ? $board->getShareToken() : null,
        ]);
    }

    #[Route('/{id}/share/regenerate', name: 'api_boards_share_regen', methods: ['POST'])]
    public function regenerateShareToken(int $id, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findOwnerOrAdmin($id, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $board->generateShareToken();
        $board->setShareEnabled(true);
        $this->em->flush();

        return $this->json(['shareToken' => $board->getShareToken(), 'shareEnabled' => true]);
    }

    #[Route('/{id}/background-image', name: 'api_boards_bg_upload', methods: ['POST'])]
    public function uploadBackground(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($id, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $file = $request->files->get('file');
        if (!$file) return $this->json(['message' => 'Aucun fichier.'], 422);

        $uploadsDir = $this->getParameter('kernel.project_dir') . '/var/uploads';
        if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

        // Delete old uploaded background if any
        $oldFond = $board->getCouleurFond();
        if ($oldFond && str_starts_with($oldFond, '/api/uploads/')) {
            $oldFile = $uploadsDir . '/' . basename($oldFond);
            if (file_exists($oldFile)) @unlink($oldFile);
        }

        $ext        = $file->guessExtension() ?? 'jpg';
        $nomFichier = bin2hex(random_bytes(16)) . '.' . $ext;
        $file->move($uploadsDir, $nomFichier);

        $board->setCouleurFond('/api/uploads/' . $nomFichier);
        $this->em->flush();

        return $this->json(['couleurFond' => $board->getCouleurFond()]);
    }

    // ─── Members ────────────────────────────────────────────────────────────

    #[Route('/{id}/members', name: 'api_boards_members_add', methods: ['POST'])]
    public function addMember(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findOwnerOrAdmin($id, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $data   = json_decode($request->getContent(), true) ?? [];
        $target = $this->em->getRepository(User::class)->find($data['userId'] ?? 0);
        if (!$target) return $this->json(['message' => 'Utilisateur introuvable.'], 404);

        foreach ($board->getMembers() as $m) {
            if ($m->getUser() === $target) return $this->json($m->toArray());
        }

        $member = (new BoardMember())->setBoard($board)->setUser($target)->setRole($data['role'] ?? 'editor');
        $this->em->persist($member);

        // Notify the new member
        $this->createNotification(
            $target,
            'assignment',
            'Vous avez été ajouté au tableau',
            "Vous avez été ajouté au tableau « {$board->getNom()} ».",
            '/todos/' . $board->getId()
        );

        $this->em->flush();
        return $this->json($member->toArray(), 201);
    }

    #[Route('/{id}/members/{userId}', name: 'api_boards_members_remove', methods: ['DELETE'])]
    public function removeMember(int $id, int $userId, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findOwnerOrAdmin($id, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        foreach ($board->getMembers() as $m) {
            if ($m->getUser()?->getId() === $userId) {
                $this->em->remove($m);
                $this->em->flush();
                return $this->json(null, 204);
            }
        }
        return $this->json(['message' => 'Membre introuvable.'], 404);
    }

    // ─── Columns ────────────────────────────────────────────────────────────

    #[Route('/{id}/columns', name: 'api_boards_columns_create', methods: ['POST'])]
    public function createColumn(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($id, $user);
        if (!$board) return $this->json(['message' => 'Tableau introuvable.'], 404);

        $data  = json_decode($request->getContent(), true) ?? [];
        $order = count($board->getColumns());

        $col = (new BoardColumn())
            ->setBoard($board)
            ->setNom($data['nom'] ?? 'Nouvelle colonne')
            ->setCouleur($data['couleur'] ?? null)
            ->setOrdre($order);

        $this->em->persist($col);
        $this->em->flush();
        return $this->json($col->toArray(true), 201);
    }

    #[Route('/{boardId}/columns/{colId}', name: 'api_boards_columns_update', methods: ['PUT', 'PATCH'])]
    public function updateColumn(int $boardId, int $colId, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($boardId, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $col = $this->em->getRepository(BoardColumn::class)->find($colId);
        if (!$col || $col->getBoard() !== $board) return $this->json(['message' => 'Colonne introuvable.'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['nom']))     $col->setNom($data['nom']);
        if (isset($data['couleur'])) $col->setCouleur($data['couleur']);
        if (isset($data['ordre']))   $col->setOrdre($data['ordre']);

        $this->em->flush();
        return $this->json($col->toArray());
    }

    #[Route('/{boardId}/columns/{colId}', name: 'api_boards_columns_delete', methods: ['DELETE'])]
    public function deleteColumn(int $boardId, int $colId, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($boardId, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $col = $this->em->getRepository(BoardColumn::class)->find($colId);
        if (!$col || $col->getBoard() !== $board) return $this->json(['message' => 'Colonne introuvable.'], 404);

        $this->em->remove($col);
        $this->em->flush();
        return $this->json(null, 204);
    }

    // ─── Tasks ──────────────────────────────────────────────────────────────

    #[Route('/{boardId}/tasks', name: 'api_tasks_create', methods: ['POST'])]
    public function createTask(int $boardId, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($boardId, $user);
        if (!$board) return $this->json(['message' => 'Tableau introuvable.'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        $col  = $this->em->getRepository(BoardColumn::class)->find($data['columnId'] ?? 0);
        if (!$col || $col->getBoard() !== $board) return $this->json(['message' => 'Colonne invalide.'], 422);

        $task = new Task();
        $task->setColumn($col);
        $task->setTitre($data['titre'] ?? '');
        $task->setDescription($data['description'] ?? null);
        $task->setCouleur($data['couleur'] ?? null);
        $task->setOrdre(count($col->getTasks()));
        $task->setJalon($data['jalon'] ?? null);

        if (!empty($data['dateEcheance'])) {
            $task->setDateEcheance(new \DateTimeImmutable($data['dateEcheance']));
        }

        $this->em->persist($task);
        $this->em->flush();
        return $this->json($task->toArray(), 201);
    }

    #[Route('/{boardId}/tasks/{taskId}', name: 'api_tasks_show', methods: ['GET'])]
    public function showTask(int $boardId, int $taskId, #[CurrentUser] User $user): JsonResponse
    {
        [$board, $task] = $this->resolveTask($boardId, $taskId, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);
        if (!$task)  return $this->json(['message' => 'Tâche introuvable.'], 404);

        return $this->json($task->toArray(true));
    }

    #[Route('/{boardId}/tasks/{taskId}', name: 'api_tasks_update', methods: ['PUT', 'PATCH'])]
    public function updateTask(int $boardId, int $taskId, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($boardId, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $task = $this->em->getRepository(Task::class)->find($taskId);
        if (!$task || $task->getColumn()?->getBoard() !== $board) return $this->json(['message' => 'Tâche introuvable.'], 404);

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['titre']))       $task->setTitre($data['titre']);
        if (isset($data['description'])) $task->setDescription($data['description']);
        if (isset($data['couleur']))     $task->setCouleur($data['couleur'] ?: null);
        if (isset($data['ordre']))       $task->setOrdre($data['ordre']);
        if (isset($data['jalon']))       $task->setJalon($data['jalon'] ?: null);

        if (array_key_exists('dateEcheance', $data)) {
            $task->setDateEcheance(!empty($data['dateEcheance']) ? new \DateTimeImmutable($data['dateEcheance']) : null);
        }

        if (isset($data['columnId'])) {
            $col = $this->em->getRepository(BoardColumn::class)->find($data['columnId']);
            if ($col && $col->getBoard() === $board) $task->setColumn($col);
        }

        if (array_key_exists('assigneeIds', $data)) {
            $task->getAssignees()->clear();
            foreach ((array) $data['assigneeIds'] as $uid) {
                $u = $this->em->getRepository(User::class)->find($uid);
                if ($u) {
                    $task->getAssignees()->add($u);
                    // Notify newly assigned user
                    if ($u !== $user) {
                        $this->createNotification(
                            $u,
                            'assignment',
                            'Vous avez été assigné à une tâche',
                            "Vous avez été assigné à « {$task->getTitre()} » dans le tableau « {$board->getNom()} ».",
                            '/todos/' . $board->getId()
                        );
                    }
                }
            }
        }

        if (array_key_exists('labelIds', $data)) {
            $task->getLabels()->clear();
            foreach ((array) $data['labelIds'] as $lid) {
                $l = $this->em->getRepository(TaskLabel::class)->find($lid);
                if ($l && $l->getBoard() === $board) $task->getLabels()->add($l);
            }
        }

        $task->setUpdatedAt(new \DateTimeImmutable());
        $this->em->flush();
        return $this->json($task->toArray());
    }

    #[Route('/{boardId}/tasks/{taskId}', name: 'api_tasks_delete', methods: ['DELETE'])]
    public function deleteTask(int $boardId, int $taskId, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($boardId, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $task = $this->em->getRepository(Task::class)->find($taskId);
        if (!$task || $task->getColumn()?->getBoard() !== $board) return $this->json(['message' => 'Tâche introuvable.'], 404);

        $this->em->remove($task);
        $this->em->flush();
        return $this->json(null, 204);
    }

    #[Route('/{boardId}/tasks/{taskId}/duplicate', name: 'api_tasks_duplicate', methods: ['POST'])]
    public function duplicateTask(int $boardId, int $taskId, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($boardId, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $src = $this->em->getRepository(Task::class)->find($taskId);
        if (!$src || $src->getColumn()?->getBoard() !== $board) {
            return $this->json(['message' => 'Tâche introuvable.'], 404);
        }

        $copy = new Task();
        $copy->setColumn($src->getColumn());
        $copy->setTitre($src->getTitre() . ' (copie)');
        $copy->setDescription($src->getDescription());
        $copy->setCouleur($src->getCouleur());
        $copy->setJalon($src->getJalon());
        $copy->setDateEcheance($src->getDateEcheance());
        $copy->setOrdre($src->getOrdre() + 1);

        foreach ($src->getLabels() as $l) $copy->getLabels()->add($l);

        $this->em->persist($copy);
        $this->em->flush();
        return $this->json($copy->toArray(), 201);
    }

    #[Route('/{boardId}/tasks/move', name: 'api_tasks_move', methods: ['POST'])]
    public function moveTasks(int $boardId, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($boardId, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $data = json_decode($request->getContent(), true) ?? [];
        foreach (($data['moves'] ?? []) as $move) {
            $task = $this->em->getRepository(Task::class)->find($move['taskId'] ?? 0);
            if (!$task || $task->getColumn()?->getBoard() !== $board) continue;

            $task->setOrdre($move['ordre'] ?? 0);
            if (isset($move['columnId'])) {
                $col = $this->em->getRepository(BoardColumn::class)->find($move['columnId']);
                if ($col && $col->getBoard() === $board) $task->setColumn($col);
            }
        }

        $this->em->flush();
        return $this->json(['ok' => true]);
    }

    // ─── Comments ───────────────────────────────────────────────────────────

    #[Route('/{boardId}/tasks/{taskId}/comments', name: 'api_task_comments_list', methods: ['GET'])]
    public function listComments(int $boardId, int $taskId, #[CurrentUser] User $user): JsonResponse
    {
        [$board, $task] = $this->resolveTask($boardId, $taskId, $user);
        if (!$board || !$task) return $this->json(['message' => 'Non trouvé.'], 404);

        return $this->json($task->getComments()->map(fn(TaskComment $c) => $c->toArray())->toArray());
    }

    #[Route('/{boardId}/tasks/{taskId}/comments', name: 'api_task_comments_create', methods: ['POST'])]
    public function addComment(int $boardId, int $taskId, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        [$board, $task] = $this->resolveTask($boardId, $taskId, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);
        if (!$task)  return $this->json(['message' => 'Tâche introuvable.'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        if (empty(trim($data['texte'] ?? ''))) return $this->json(['message' => 'Commentaire vide.'], 422);

        $comment = (new TaskComment())
            ->setTask($task)
            ->setAuteur($user)
            ->setTexte(trim($data['texte']));

        $this->em->persist($comment);

        // Notify assignees and board owner (except commenter)
        $toNotify = [];
        foreach ($task->getAssignees() as $assignee) {
            if ($assignee !== $user) $toNotify[$assignee->getId()] = $assignee;
        }
        if ($board->getProprietaire() !== $user) {
            $toNotify[$board->getProprietaire()->getId()] = $board->getProprietaire();
        }

        $auteurNom = $user->getPrenom() . ' ' . $user->getNom();
        foreach ($toNotify as $recipient) {
            $this->createNotification(
                $recipient,
                'comment',
                "{$auteurNom} a commenté une tâche",
                "« {$task->getTitre()} » : " . mb_substr(trim($data['texte']), 0, 100),
                '/todos/' . $board->getId()
            );
        }

        $task->setUpdatedAt(new \DateTimeImmutable());
        $this->em->flush();
        return $this->json($comment->toArray(), 201);
    }

    #[Route('/{boardId}/tasks/{taskId}/comments/{commentId}', name: 'api_task_comments_delete', methods: ['DELETE'])]
    public function deleteComment(int $boardId, int $taskId, int $commentId, #[CurrentUser] User $user): JsonResponse
    {
        [$board, $task] = $this->resolveTask($boardId, $taskId, $user);
        if (!$board || !$task) return $this->json(['message' => 'Non trouvé.'], 404);

        $comment = $this->em->getRepository(TaskComment::class)->find($commentId);
        if (!$comment || $comment->getTask() !== $task) return $this->json(['message' => 'Commentaire introuvable.'], 404);

        $isOwner   = $comment->getAuteur() === $user;
        $isAdmin   = in_array('ROLE_ADMIN', $user->getRoles());
        $isBoardOwner = $board->getProprietaire() === $user;

        if (!$isOwner && !$isAdmin && !$isBoardOwner) return $this->json(['message' => 'Non autorisé.'], 403);

        $this->em->remove($comment);
        $this->em->flush();
        return $this->json(null, 204);
    }

    // ─── Attachments ─────────────────────────────────────────────────────────

    #[Route('/{boardId}/tasks/{taskId}/attachments', name: 'api_task_attachments_list', methods: ['GET'])]
    public function listAttachments(int $boardId, int $taskId, #[CurrentUser] User $user): JsonResponse
    {
        [$board, $task] = $this->resolveTask($boardId, $taskId, $user);
        if (!$board || !$task) return $this->json(['message' => 'Non trouvé.'], 404);

        return $this->json($task->getAttachments()->map(fn(TaskAttachment $a) => $a->toArray())->toArray());
    }

    #[Route('/{boardId}/tasks/{taskId}/attachments', name: 'api_task_attachments_upload', methods: ['POST'])]
    public function uploadAttachment(int $boardId, int $taskId, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        [$board, $task] = $this->resolveTask($boardId, $taskId, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);
        if (!$task)  return $this->json(['message' => 'Tâche introuvable.'], 404);

        $file = $request->files->get('file');
        if (!$file) return $this->json(['message' => 'Aucun fichier.'], 422);

        $uploadsDir = $this->getParameter('kernel.project_dir') . '/var/uploads';
        if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0755, true);

        $ext        = $file->guessExtension() ?? 'bin';
        $nomFichier = bin2hex(random_bytes(16)) . '.' . $ext;
        $file->move($uploadsDir, $nomFichier);

        $attachment = (new TaskAttachment())
            ->setTask($task)
            ->setNomOriginal($file->getClientOriginalName())
            ->setNomFichier($nomFichier)
            ->setMimeType($file->getMimeType() ?? 'application/octet-stream')
            ->setTaille($file->getSize() ?? 0)
            ->setUploadedBy($user);

        $this->em->persist($attachment);
        $task->setUpdatedAt(new \DateTimeImmutable());
        $this->em->flush();

        return $this->json($attachment->toArray(), 201);
    }

    #[Route('/{boardId}/tasks/{taskId}/attachments/{attachmentId}', name: 'api_task_attachments_delete', methods: ['DELETE'])]
    public function deleteAttachment(int $boardId, int $taskId, int $attachmentId, #[CurrentUser] User $user): JsonResponse
    {
        [$board, $task] = $this->resolveTask($boardId, $taskId, $user);
        if (!$board || !$task) return $this->json(['message' => 'Non trouvé.'], 404);

        $attachment = $this->em->getRepository(TaskAttachment::class)->find($attachmentId);
        if (!$attachment || $attachment->getTask() !== $task) return $this->json(['message' => 'Pièce jointe introuvable.'], 404);

        $uploadsDir = $this->getParameter('kernel.project_dir') . '/var/uploads';
        $filePath   = $uploadsDir . '/' . $attachment->getNomFichier();
        if (file_exists($filePath)) unlink($filePath);

        $this->em->remove($attachment);
        $this->em->flush();
        return $this->json(null, 204);
    }

    // ─── Checklist ──────────────────────────────────────────────────────────

    #[Route('/{boardId}/tasks/{taskId}/checklist', name: 'api_checklist_create', methods: ['POST'])]
    public function addChecklistItem(int $boardId, int $taskId, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        [$board, $task] = $this->resolveTask($boardId, $taskId, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);
        if (!$task)  return $this->json(['message' => 'Tâche introuvable.'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        $item = (new TaskChecklistItem())
            ->setTask($task)
            ->setTexte($data['texte'] ?? '')
            ->setOrdre(count($task->getChecklistItems()));

        $this->em->persist($item);
        $this->em->flush();
        return $this->json($item->toArray(), 201);
    }

    #[Route('/{boardId}/tasks/{taskId}/checklist/{itemId}', name: 'api_checklist_update', methods: ['PUT', 'PATCH'])]
    public function updateChecklistItem(int $boardId, int $taskId, int $itemId, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        [$board, $task] = $this->resolveTask($boardId, $taskId, $user);
        if (!$board || !$task) return $this->json(['message' => 'Non trouvé.'], 404);

        $item = $this->em->getRepository(TaskChecklistItem::class)->find($itemId);
        if (!$item || $item->getTask() !== $task) return $this->json(['message' => 'Item introuvable.'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['texte']))   $item->setTexte($data['texte']);
        if (isset($data['checked'])) $item->setChecked((bool) $data['checked']);

        $this->em->flush();
        return $this->json($item->toArray());
    }

    #[Route('/{boardId}/tasks/{taskId}/checklist/{itemId}', name: 'api_checklist_delete', methods: ['DELETE'])]
    public function deleteChecklistItem(int $boardId, int $taskId, int $itemId, #[CurrentUser] User $user): JsonResponse
    {
        [$board, $task] = $this->resolveTask($boardId, $taskId, $user);
        if (!$board || !$task) return $this->json(['message' => 'Non trouvé.'], 404);

        $item = $this->em->getRepository(TaskChecklistItem::class)->find($itemId);
        if (!$item || $item->getTask() !== $task) return $this->json(['message' => 'Item introuvable.'], 404);

        $this->em->remove($item);
        $this->em->flush();
        return $this->json(null, 204);
    }

    // ─── Labels ─────────────────────────────────────────────────────────────

    #[Route('/{id}/labels', name: 'api_labels_create', methods: ['POST'])]
    public function createLabel(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($id, $user);
        if (!$board) return $this->json(['message' => 'Tableau introuvable.'], 404);

        $data  = json_decode($request->getContent(), true) ?? [];
        $label = (new TaskLabel())->setBoard($board)->setNom($data['nom'] ?? '')->setCouleur($data['couleur'] ?? '#61BD4F');

        $this->em->persist($label);
        $this->em->flush();
        return $this->json($label->toArray(), 201);
    }

    #[Route('/{id}/labels/{labelId}', name: 'api_labels_delete', methods: ['DELETE'])]
    public function deleteLabel(int $id, int $labelId, #[CurrentUser] User $user): JsonResponse
    {
        $board = $this->findAccessible($id, $user);
        if (!$board) return $this->json(['message' => 'Non autorisé.'], 403);

        $label = $this->em->getRepository(TaskLabel::class)->find($labelId);
        if (!$label || $label->getBoard() !== $board) return $this->json(['message' => 'Label introuvable.'], 404);

        $this->em->remove($label);
        $this->em->flush();
        return $this->json(null, 204);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private function findAccessible(int $id, User $user): ?Board
    {
        $board = $this->em->getRepository(Board::class)->find($id);
        if (!$board) return null;
        if ($board->getVisibilite() === 'equipe') return $board;
        if ($board->getProprietaire() === $user) return $board;
        foreach ($board->getMembers() as $m) {
            if ($m->getUser() === $user) return $board;
        }
        return null;
    }

    private function findOwnerOrAdmin(int $id, User $user): ?Board
    {
        $board = $this->em->getRepository(Board::class)->find($id);
        if (!$board) return null;
        if ($board->getProprietaire() === $user) return $board;
        if (in_array('ROLE_ADMIN', $user->getRoles())) return $board;
        return null;
    }

    private function resolveTask(int $boardId, int $taskId, User $user): array
    {
        $board = $this->findAccessible($boardId, $user);
        if (!$board) return [null, null];
        $task = $this->em->getRepository(Task::class)->find($taskId);
        if (!$task || $task->getColumn()?->getBoard() !== $board) return [$board, null];
        return [$board, $task];
    }

    private function boardDetail(Board $board): array
    {
        $data = $board->toArray();
        $data['columns'] = $board->getColumns()->map(
            fn(BoardColumn $c) => $c->toArray(true)
        )->toArray();
        $data['labels'] = $board->getLabels()->map(fn(TaskLabel $l) => $l->toArray())->toArray();
        $data['users']  = array_map(fn(User $u) => $u->toArray(), $this->em->getRepository(User::class)->findAll());
        return $data;
    }

    private function createNotification(User $user, string $type, string $titre, ?string $contenu, ?string $url): void
    {
        $notif = (new Notification())
            ->setDestinataire($user)
            ->setType($type)
            ->setTitre($titre)
            ->setContenu($contenu)
            ->setLienUrl($url);
        $this->em->persist($notif);
    }
}
