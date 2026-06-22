<?php

namespace App\Controller\Api;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/users')]
#[IsGranted('ROLE_EMPLOYEE')]
class UserController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
    ) {}

    #[Route('', name: 'api_users_list', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function list(): JsonResponse
    {
        $users = $this->em->getRepository(User::class)->findAll();
        return $this->json(array_map(fn(User $u) => array_merge($u->toArray(), [
            'createdAt' => $u->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ]), $users));
    }

    /** Returns basic info for all users — used by note sharing, board members, etc. */
    #[Route('/colleagues', name: 'api_users_colleagues', methods: ['GET'])]
    public function colleagues(): JsonResponse
    {
        $users = $this->em->getRepository(User::class)->findAll();
        return $this->json(array_map(fn(User $u) => [
            'id'     => $u->getId(),
            'prenom' => $u->getPrenom(),
            'nom'    => $u->getNom(),
            'email'  => $u->getEmail(),
        ], $users));
    }

    #[Route('/me', name: 'api_users_me', methods: ['GET'])]
    public function me(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json($user->toArray());
    }

    #[Route('/me', name: 'api_users_me_update', methods: ['PUT', 'PATCH'])]
    public function updateMe(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['prenom'])) $user->setPrenom($data['prenom']);
        if (isset($data['nom']))    $user->setNom($data['nom']);

        if (!empty($data['newPassword'])) {
            if (empty($data['currentPassword'])) {
                return $this->json(['message' => 'Mot de passe actuel requis.'], 422);
            }
            if (!$this->hasher->isPasswordValid($user, $data['currentPassword'])) {
                return $this->json(['message' => 'Mot de passe actuel incorrect.'], 422);
            }
            $user->setPassword($this->hasher->hashPassword($user, $data['newPassword']));
        }

        $this->em->flush();
        return $this->json($user->toArray());
    }

    #[Route('', name: 'api_users_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $existing = $this->em->getRepository(User::class)->findOneBy(['email' => $data['email'] ?? '']);
        if ($existing) {
            return $this->json(['message' => 'Cet email est déjà utilisé.'], 422);
        }

        $user = new User();
        $user->setEmail($data['email'] ?? '');
        $user->setPrenom($data['prenom'] ?? '');
        $user->setNom($data['nom'] ?? '');
        $user->setPassword($this->hasher->hashPassword($user, $data['password'] ?? ''));

        if (!empty($data['roles'])) {
            $user->setRoles($data['roles']);
        }

        $this->em->persist($user);
        $this->em->flush();

        return $this->json($user->toArray(), 201);
    }

    #[Route('/{id}', name: 'api_users_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_ADMIN')]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->em->getRepository(User::class)->find($id);
        if (!$user) {
            return $this->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['email']))  $user->setEmail($data['email']);
        if (isset($data['prenom'])) $user->setPrenom($data['prenom']);
        if (isset($data['nom']))    $user->setNom($data['nom']);
        if (isset($data['roles']))  $user->setRoles($data['roles']);
        if (!empty($data['password'])) {
            $user->setPassword($this->hasher->hashPassword($user, $data['password']));
        }

        $this->em->flush();
        return $this->json($user->toArray());
    }

    #[Route('/{id}', name: 'api_users_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(int $id, #[CurrentUser] User $currentUser): JsonResponse
    {
        $user = $this->em->getRepository(User::class)->find($id);
        if (!$user) {
            return $this->json(['message' => 'Utilisateur introuvable.'], 404);
        }
        if ($user === $currentUser) {
            return $this->json(['message' => 'Impossible de supprimer votre propre compte.'], 422);
        }

        $this->em->remove($user);
        $this->em->flush();

        return $this->json(null, 204);
    }
}
