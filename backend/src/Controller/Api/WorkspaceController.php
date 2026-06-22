<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Entity\Workspace;
use App\Entity\WorkspaceMember;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/workspaces')]
#[IsGranted('ROLE_EMPLOYEE')]
class WorkspaceController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    #[Route('', name: 'api_workspaces_list', methods: ['GET'])]
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        $workspaces = $this->em->getRepository(Workspace::class)->createQueryBuilder('w')
            ->leftJoin('w.members', 'm')
            ->where('w.proprietaire = :u OR m.user = :u')
            ->setParameter('u', $user)
            ->orderBy('w.createdAt', 'ASC')
            ->getQuery()->getResult();

        return $this->json(array_map(fn(Workspace $w) => $w->toArray(), $workspaces));
    }

    #[Route('', name: 'api_workspaces_create', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $workspace = new Workspace();
        $workspace->setNom($data['nom'] ?? 'Nouvel espace');
        $workspace->setDescription($data['description'] ?? null);
        $workspace->setCouleur($data['couleur'] ?? '#5243AA');
        $workspace->setProprietaire($user);

        $this->em->persist($workspace);
        $this->em->flush();

        return $this->json($workspace->toArray(), 201);
    }

    #[Route('/{id}', name: 'api_workspaces_show', methods: ['GET'])]
    public function show(int $id, #[CurrentUser] User $user): JsonResponse
    {
        $workspace = $this->findAccessible($id, $user);
        if (!$workspace) return $this->json(['message' => 'Espace introuvable.'], 404);

        return $this->json($workspace->toArray());
    }

    #[Route('/{id}', name: 'api_workspaces_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $workspace = $this->findOwnerOrAdmin($id, $user);
        if (!$workspace) return $this->json(['message' => 'Non autorisé.'], 403);

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['nom']))         $workspace->setNom($data['nom']);
        if (isset($data['description'])) $workspace->setDescription($data['description']);
        if (isset($data['couleur']))     $workspace->setCouleur($data['couleur']);

        $this->em->flush();
        return $this->json($workspace->toArray());
    }

    #[Route('/{id}', name: 'api_workspaces_delete', methods: ['DELETE'])]
    public function delete(int $id, #[CurrentUser] User $user): JsonResponse
    {
        $workspace = $this->findOwnerOrAdmin($id, $user);
        if (!$workspace) return $this->json(['message' => 'Non autorisé.'], 403);

        $this->em->remove($workspace);
        $this->em->flush();
        return $this->json(null, 204);
    }

    #[Route('/{id}/members', name: 'api_workspaces_members_add', methods: ['POST'])]
    public function addMember(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $workspace = $this->findOwnerOrAdmin($id, $user);
        if (!$workspace) return $this->json(['message' => 'Non autorisé.'], 403);

        $data   = json_decode($request->getContent(), true) ?? [];
        $target = $this->em->getRepository(User::class)->find($data['userId'] ?? 0);
        if (!$target) return $this->json(['message' => 'Utilisateur introuvable.'], 404);

        // Check no duplicate
        foreach ($workspace->getMembers() as $m) {
            if ($m->getUser() === $target) return $this->json($m->toArray());
        }

        $member = (new WorkspaceMember())
            ->setWorkspace($workspace)
            ->setUser($target)
            ->setRole($data['role'] ?? 'member');

        $this->em->persist($member);
        $this->em->flush();
        return $this->json($member->toArray(), 201);
    }

    #[Route('/{id}/members/{userId}', name: 'api_workspaces_members_remove', methods: ['DELETE'])]
    public function removeMember(int $id, int $userId, #[CurrentUser] User $user): JsonResponse
    {
        $workspace = $this->findOwnerOrAdmin($id, $user);
        if (!$workspace) return $this->json(['message' => 'Non autorisé.'], 403);

        foreach ($workspace->getMembers() as $m) {
            if ($m->getUser()?->getId() === $userId) {
                $this->em->remove($m);
                $this->em->flush();
                return $this->json(null, 204);
            }
        }
        return $this->json(['message' => 'Membre introuvable.'], 404);
    }

    private function findAccessible(int $id, User $user): ?Workspace
    {
        $ws = $this->em->getRepository(Workspace::class)->find($id);
        if (!$ws) return null;
        if ($ws->getProprietaire() === $user) return $ws;
        foreach ($ws->getMembers() as $m) {
            if ($m->getUser() === $user) return $ws;
        }
        return null;
    }

    private function findOwnerOrAdmin(int $id, User $user): ?Workspace
    {
        $ws = $this->em->getRepository(Workspace::class)->find($id);
        if (!$ws) return null;
        if ($ws->getProprietaire() === $user) return $ws;
        if (in_array('ROLE_ADMIN', $user->getRoles())) return $ws;
        foreach ($ws->getMembers() as $m) {
            if ($m->getUser() === $user && $m->getRole() === 'admin') return $ws;
        }
        return null;
    }
}
