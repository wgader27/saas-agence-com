<?php

namespace App\Controller\Api;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use App\Entity\User;

#[Route('/api/auth')]
class AuthController extends AbstractController
{
    /**
     * Point d'entrée pour la connexion — Symfony Security gère l'authentification.
     * Cette route est définie dans security.yaml comme form_login JSON.
     */
    #[Route('/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(#[CurrentUser] ?User $user): JsonResponse
    {
        if (!$user) {
            return $this->json(['message' => 'Identifiants invalides.'], 401);
        }

        return $this->json(['user' => $user->toArray()]);
    }

    #[Route('/me', name: 'api_auth_me', methods: ['GET'])]
    public function me(#[CurrentUser] ?User $user): JsonResponse
    {
        if (!$user) {
            return $this->json(['message' => 'Non authentifié.'], 401);
        }

        return $this->json(['user' => $user->toArray()]);
    }

    #[Route('/logout', name: 'api_auth_logout', methods: ['POST'])]
    public function logout(): never
    {
        // Géré par Symfony Security (security.yaml logout path)
        throw new \LogicException('Cette route est interceptée par le firewall Symfony.');
    }
}
