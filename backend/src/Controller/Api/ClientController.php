<?php

namespace App\Controller\Api;

use App\Entity\Client;
use App\Entity\Domain;
use App\Entity\SiteAccess;
use App\Service\EncryptionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/clients')]
#[IsGranted('ROLE_EMPLOYEE')]
class ClientController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ValidatorInterface $validator,
        private readonly EncryptionService $encryption,
    ) {}

    #[Route('', name: 'api_clients_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $clients = $this->em->getRepository(Client::class)->findBy([], ['createdAt' => 'DESC']);
        return $this->json(array_map(fn(Client $c) => $c->toArray(), $clients));
    }

    #[Route('', name: 'api_clients_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $client = new Client();
        $client->setNom($data['nom'] ?? '');
        $client->setSecteur($data['secteur'] ?? null);
        $client->setContact($data['contact'] ?? null);
        $client->setTelephone($data['telephone'] ?? null);
        $client->setEmail($data['email'] ?? null);
        $client->setNotesGenerales($data['notesGenerales'] ?? null);

        $errors = $this->validator->validate($client);
        if (count($errors) > 0) {
            return $this->json(['message' => (string) $errors[0]->getMessage()], 422);
        }

        $this->em->persist($client);
        $this->em->flush();

        return $this->json($client->toArray(), 201);
    }

    #[Route('/search', name: 'api_clients_search', methods: ['GET'])]
    public function search(Request $request): JsonResponse
    {
        $q       = $request->query->getString('q');
        $clients = $this->em->getRepository(Client::class)
            ->createQueryBuilder('c')
            ->where('LOWER(c.nom) LIKE :q OR LOWER(c.secteur) LIKE :q OR LOWER(c.contact) LIKE :q')
            ->setParameter('q', '%' . mb_strtolower($q) . '%')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult();

        return $this->json(array_map(fn(Client $c) => $c->toArray(), $clients));
    }

    #[Route('/{id}', name: 'api_clients_show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id): JsonResponse
    {
        $client = $this->em->getRepository(Client::class)->find($id);
        if (!$client) {
            return $this->json(['message' => 'Client introuvable.'], 404);
        }

        $domains  = $this->em->getRepository(Domain::class)->findBy(['client' => $client]);
        $accesses = $this->em->getRepository(SiteAccess::class)->findBy(['client' => $client]);

        $accessArray = array_map(function (SiteAccess $a) {
            $login    = $a->getLogin() ? $this->encryption->decrypt($a->getLogin()) : '';
            $password = $a->getPassword() ? $this->encryption->decrypt($a->getPassword()) : '';
            return $a->toArray($login, $password);
        }, $accesses);

        return $this->json([
            'client'   => $client->toArray(),
            'domains'  => array_map(fn(Domain $d) => $d->toArray(), $domains),
            'accesses' => $accessArray,
        ]);
    }

    #[Route('/{id}', name: 'api_clients_update', methods: ['PUT', 'PATCH'], requirements: ['id' => '\d+'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $client = $this->em->getRepository(Client::class)->find($id);
        if (!$client) {
            return $this->json(['message' => 'Client introuvable.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['nom']))                        $client->setNom($data['nom']);
        if (array_key_exists('secteur', $data))         $client->setSecteur($data['secteur']);
        if (array_key_exists('contact', $data))         $client->setContact($data['contact']);
        if (array_key_exists('telephone', $data))       $client->setTelephone($data['telephone']);
        if (array_key_exists('email', $data))           $client->setEmail($data['email']);
        if (array_key_exists('notesGenerales', $data))  $client->setNotesGenerales($data['notesGenerales']);

        $errors = $this->validator->validate($client);
        if (count($errors) > 0) {
            return $this->json(['message' => (string) $errors[0]->getMessage()], 422);
        }

        $this->em->flush();

        return $this->json($client->toArray());
    }

    #[Route('/{id}', name: 'api_clients_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(int $id): JsonResponse
    {
        $client = $this->em->getRepository(Client::class)->find($id);
        if (!$client) {
            return $this->json(['message' => 'Client introuvable.'], 404);
        }

        $this->em->remove($client);
        $this->em->flush();

        return $this->json(null, 204);
    }

}
