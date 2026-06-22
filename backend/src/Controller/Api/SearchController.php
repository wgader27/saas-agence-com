<?php

namespace App\Controller\Api;

use App\Entity\Client;
use App\Entity\Domain;
use App\Entity\Note;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
#[IsGranted('ROLE_EMPLOYEE')]
class SearchController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    #[Route('/search', name: 'api_search', methods: ['GET'])]
    public function search(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $q = trim($request->query->getString('q'));
        if (strlen($q) < 2) {
            return $this->json(['clients' => [], 'domains' => [], 'notes' => []]);
        }

        $clients = $this->em->getRepository(Client::class)
            ->createQueryBuilder('c')
            ->where('c.nom LIKE :q OR c.secteur LIKE :q')
            ->setParameter('q', "%{$q}%")
            ->setMaxResults(5)
            ->getQuery()->getResult();

        $domains = $this->em->getRepository(Domain::class)
            ->createQueryBuilder('d')
            ->leftJoin('d.client', 'c')
            ->where('d.nomDomaine LIKE :q')
            ->setParameter('q', "%{$q}%")
            ->setMaxResults(5)
            ->getQuery()->getResult();

        $notesQb = $this->em->getRepository(Note::class)
            ->createQueryBuilder('n')
            ->where('n.titre LIKE :q OR n.contenu LIKE :q')
            ->setParameter('q', "%{$q}%")
            ->setMaxResults(5);

        if (!$this->isGranted('ROLE_ADMIN')) {
            $notesQb->andWhere('n.visibilite = :eq OR n.auteur = :user')
                ->setParameter('eq', 'equipe')
                ->setParameter('user', $user);
        }

        $notes = $notesQb->getQuery()->getResult();

        return $this->json([
            'clients' => array_map(fn(Client $c) => $c->toArray(), $clients),
            'domains' => array_map(fn(Domain $d) => $d->toArray(), $domains),
            'notes'   => array_map(fn(Note $n) => $n->toArray(), $notes),
        ]);
    }
}
