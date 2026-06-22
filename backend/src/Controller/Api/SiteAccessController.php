<?php

namespace App\Controller\Api;

use App\Entity\Client;
use App\Entity\SiteAccess;
use App\Service\ActivityLogService;
use App\Service\EncryptionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use App\Entity\User;

#[Route('/api/site-accesses')]
#[IsGranted('ROLE_EMPLOYEE')]
class SiteAccessController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EncryptionService $encryption,
        private readonly ActivityLogService $activityLog,
    ) {}

    #[Route('', name: 'api_accesses_list', methods: ['GET'])]
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        $accesses = $this->em->getRepository(SiteAccess::class)->findAll();

        $result = array_map(function (SiteAccess $a) {
            $login    = $a->getLogin() ? $this->encryption->decrypt($a->getLogin()) : '';
            $password = $a->getPassword() ? $this->encryption->decrypt($a->getPassword()) : '';
            return $a->toArray($login, $password);
        }, $accesses);

        $this->activityLog->log($user, 'a consulté', 'le coffre-fort des accès');

        return $this->json($result);
    }

    #[Route('', name: 'api_accesses_create', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $client = $this->em->getRepository(Client::class)->find($data['clientId'] ?? 0);
        if (!$client) {
            return $this->json(['message' => 'Client introuvable.'], 404);
        }

        $access = new SiteAccess();
        $access->setClient($client);
        $access->setType($data['type'] ?? 'hebergement');
        $access->setLabel($data['label'] ?? '');
        $access->setUrl($data['url'] ?? null);
        $access->setLogin($this->encryption->encrypt($data['login'] ?? ''));
        $access->setPassword($this->encryption->encrypt($data['password'] ?? ''));
        $access->setNotes($data['notes'] ?? null);

        $this->em->persist($access);
        $this->em->flush();

        $this->activityLog->log($user, 'a créé un accès', $access->getLabel());

        $login    = $this->encryption->decrypt($access->getLogin());
        $password = $this->encryption->decrypt($access->getPassword());

        return $this->json($access->toArray($login, $password), 201);
    }

    #[Route('/{id}', name: 'api_accesses_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $access = $this->em->getRepository(SiteAccess::class)->find($id);
        if (!$access) {
            return $this->json(['message' => 'Accès introuvable.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['clientId'])) {
            $client = $this->em->getRepository(Client::class)->find($data['clientId']);
            if (!$client) return $this->json(['message' => 'Client introuvable.'], 404);
            $access->setClient($client);
        }
        if (isset($data['type']))    $access->setType($data['type']);
        if (isset($data['label']))   $access->setLabel($data['label']);
        if (array_key_exists('url', $data))   $access->setUrl($data['url'] ?: null);
        if (isset($data['login']))   $access->setLogin($this->encryption->encrypt($data['login']));
        if (isset($data['password']) && $data['password'] !== '••••••••') {
            $access->setPassword($this->encryption->encrypt($data['password']));
        }
        if (array_key_exists('notes', $data)) $access->setNotes($data['notes'] ?: null);

        $this->em->flush();
        $this->activityLog->log($user, 'a modifié un accès', $access->getLabel());

        $login    = $this->encryption->decrypt($access->getLogin());
        $password = $this->encryption->decrypt($access->getPassword());

        return $this->json($access->toArray($login, $password));
    }

    #[Route('/{id}', name: 'api_accesses_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(int $id, #[CurrentUser] User $user): JsonResponse
    {
        $access = $this->em->getRepository(SiteAccess::class)->find($id);
        if (!$access) {
            return $this->json(['message' => 'Accès introuvable.'], 404);
        }

        $label = $access->getLabel();
        $this->em->remove($access);
        $this->em->flush();

        $this->activityLog->log($user, 'a supprimé un accès', $label);

        return $this->json(null, 204);
    }
}
