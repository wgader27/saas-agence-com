<?php

namespace App\Controller\Api;

use App\Entity\Client;
use App\Entity\Domain;
use App\Service\SslCheckerService;
use App\Service\WhoisService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/domains')]
#[IsGranted('ROLE_EMPLOYEE')]
class DomainController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SslCheckerService $sslChecker,
        private readonly WhoisService $whois,
    ) {}

    #[Route('', name: 'api_domains_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $domains = $this->em->getRepository(Domain::class)->findAll();
        return $this->json(array_map(fn(Domain $d) => $d->toArray(), $domains));
    }

    #[Route('', name: 'api_domains_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $domain = new Domain();
        $domain->setNomDomaine($data['nomDomaine'] ?? '');
        $domain->setRegistrar($data['registrar'] ?? null);
        $domain->setHebergeur($data['hebergeur'] ?? null);

        if (!empty($data['clientId'])) {
            $client = $this->em->getRepository(Client::class)->find($data['clientId']);
            if ($client) $domain->setClient($client);
        }

        $this->em->persist($domain);
        $this->em->flush();

        // Auto-detect SSL expiry on creation
        $nomDomaine = $domain->getNomDomaine();
        if ($nomDomaine) {
            $sslExpiry = $this->sslChecker->getExpiryDate($nomDomaine);
            if ($sslExpiry !== null) {
                $domain->setDateExpirationSsl($sslExpiry);
                $this->em->flush();
            }
        }

        return $this->json($domain->toArray(), 201);
    }

    #[Route('/refresh', name: 'api_domains_refresh', methods: ['POST'])]
    public function refresh(): JsonResponse
    {
        $domains = $this->em->getRepository(Domain::class)->findAll();
        $updated = 0;

        foreach ($domains as $domain) {
            $name = $domain->getNomDomaine();
            if (!$name) continue;

            $expiry = $this->sslChecker->getExpiryDate($name);
            if ($expiry !== null) {
                $domain->setDateExpirationSsl($expiry);
                $updated++;
            }
        }

        $this->em->flush();

        return $this->json([
            'message' => "SSL vérifié pour {$updated} domaine(s).",
            'domains' => array_map(fn(Domain $d) => $d->toArray(), $domains),
        ]);
    }

    #[Route('/{id}', name: 'api_domains_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $domain = $this->em->getRepository(Domain::class)->find($id);
        if (!$domain) {
            return $this->json(['message' => 'Domaine introuvable.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['nomDomaine']))  $domain->setNomDomaine($data['nomDomaine']);
        if (array_key_exists('registrar', $data)) $domain->setRegistrar($data['registrar'] ?: null);
        if (array_key_exists('hebergeur', $data)) $domain->setHebergeur($data['hebergeur'] ?: null);
        if (!empty($data['clientId'])) {
            $client = $this->em->getRepository(Client::class)->find($data['clientId']);
            if ($client) $domain->setClient($client);
        }
        if (array_key_exists('dateExpirationDomaine', $data)) {
            $domain->setDateExpirationDomaine(!empty($data['dateExpirationDomaine'])
                ? new \DateTimeImmutable($data['dateExpirationDomaine']) : null);
        }
        if (array_key_exists('dateExpirationSsl', $data)) {
            $domain->setDateExpirationSsl(!empty($data['dateExpirationSsl'])
                ? new \DateTimeImmutable($data['dateExpirationSsl']) : null);
        }

        $this->em->flush();
        return $this->json($domain->toArray());
    }

    #[Route('/{id}/lookup', name: 'api_domains_lookup', methods: ['POST'])]
    public function lookup(int $id): JsonResponse
    {
        $domain = $this->em->getRepository(Domain::class)->find($id);
        if (!$domain) {
            return $this->json(['message' => 'Domaine introuvable.'], 404);
        }

        $nomDomaine = $domain->getNomDomaine();
        if (!$nomDomaine) return $this->json(['message' => 'Nom de domaine manquant.'], 422);

        $whoisData = $this->whois->lookup($nomDomaine);
        $updated   = false;

        if ($whoisData['registrar'] && !$domain->getRegistrar()) {
            $domain->setRegistrar($whoisData['registrar']);
            $updated = true;
        }
        if ($whoisData['expiration'] instanceof \DateTimeImmutable && !$domain->getDateExpirationDomaine()) {
            $domain->setDateExpirationDomaine($whoisData['expiration']);
            $updated = true;
        }

        // Also check SSL
        $sslExpiry = $this->sslChecker->getExpiryDate($nomDomaine);
        if ($sslExpiry !== null) {
            $domain->setDateExpirationSsl($sslExpiry);
            $updated = true;
        }

        if ($updated) {
            $domain->setUpdatedAt(new \DateTimeImmutable());
            $this->em->flush();
        }

        return $this->json(array_merge($domain->toArray(), [
            'whoisRaw' => $whoisData,
            'updated'  => $updated,
        ]));
    }

    #[Route('/{id}', name: 'api_domains_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(int $id): JsonResponse
    {
        $domain = $this->em->getRepository(Domain::class)->find($id);
        if (!$domain) {
            return $this->json(['message' => 'Domaine introuvable.'], 404);
        }

        $this->em->remove($domain);
        $this->em->flush();

        return $this->json(null, 204);
    }
}
