<?php

namespace App\Controller\Api;

use App\Entity\ActivityLog;
use App\Entity\CalendarEvent;
use App\Entity\Client;
use App\Entity\Domain;
use App\Entity\Task;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use App\Entity\User;

#[Route('/api')]
#[IsGranted('ROLE_EMPLOYEE')]
class DashboardController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    #[Route('/dashboard', name: 'api_dashboard', methods: ['GET'])]
    public function dashboard(#[CurrentUser] User $user): JsonResponse
    {
        $totalClients  = $this->em->getRepository(Client::class)->count([]);
        $totalDomaines = $this->em->getRepository(Domain::class)->count([]);

        $now   = new \DateTimeImmutable();
        $limit = $now->modify('+30 days');

        // Domaines qui expirent dans <= 30 jours
        $expiringDomains = $this->em->getRepository(Domain::class)
            ->createQueryBuilder('d')
            ->where('d.dateExpirationDomaine IS NOT NULL')
            ->andWhere('d.dateExpirationDomaine <= :limit')
            ->setParameter('limit', $limit)
            ->orderBy('d.dateExpirationDomaine', 'ASC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult();

        // Activité récente
        $recentActivity = $this->em->getRepository(ActivityLog::class)
            ->findBy([], ['createdAt' => 'DESC'], 10);

        // Tâches en retard (toutes colonnes, tous tableaux)
        $overdueTasks = $this->em->getRepository(Task::class)
            ->createQueryBuilder('t')
            ->leftJoin('t.column', 'col')
            ->leftJoin('col.board', 'board')
            ->addSelect('col', 'board')
            ->where('t.dateEcheance IS NOT NULL')
            ->andWhere('t.dateEcheance < :now')
            ->setParameter('now', $now)
            ->orderBy('t.dateEcheance', 'ASC')
            ->setMaxResults(6)
            ->getQuery()
            ->getResult();

        // Événements à venir (7 prochains jours, tous utilisateurs)
        $in7days = $now->modify('+7 days');
        $upcomingEvents = $this->em->getRepository(CalendarEvent::class)
            ->createQueryBuilder('e')
            ->where('e.date >= :today')
            ->andWhere('e.date <= :in7days')
            ->setParameter('today', $now->format('Y-m-d'))
            ->setParameter('in7days', $in7days->format('Y-m-d'))
            ->orderBy('e.date', 'ASC')
            ->addOrderBy('e.heureDebut', 'ASC')
            ->setMaxResults(8)
            ->getQuery()
            ->getResult();

        return $this->json([
            'totalClients'    => $totalClients,
            'totalDomaines'   => $totalDomaines,
            'expiringDomains' => array_map(fn(Domain $d) => $d->toArray(), $expiringDomains),
            'recentActivity'  => array_map(fn(ActivityLog $l) => $l->toArray(), $recentActivity),
            'overdueTasks'    => array_map(function (Task $t) {
                return array_merge($t->toArray(), [
                    'boardId'   => $t->getColumn()?->getBoard()?->getId(),
                    'boardNom'  => $t->getColumn()?->getBoard()?->getNom(),
                    'columnNom' => $t->getColumn()?->getNom(),
                ]);
            }, $overdueTasks),
            'upcomingEvents'  => array_map(fn(CalendarEvent $e) => $e->toArray(), $upcomingEvents),
        ]);
    }

    #[Route('/search', name: 'api_search', methods: ['GET'])]
    public function search(\Symfony\Component\HttpFoundation\Request $request): JsonResponse
    {
        $q = $request->query->getString('q');
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

        $notes = $this->em->getRepository(\App\Entity\Note::class)
            ->createQueryBuilder('n')
            ->where('n.visibilite = :eq AND (n.titre LIKE :q OR n.contenu LIKE :q)')
            ->setParameter('eq', 'equipe')
            ->setParameter('q', "%{$q}%")
            ->setMaxResults(5)
            ->getQuery()->getResult();

        return $this->json([
            'clients' => array_map(fn(Client $c) => $c->toArray(), $clients),
            'domains' => array_map(fn(Domain $d) => $d->toArray(), $domains),
            'notes'   => array_map(fn(\App\Entity\Note $n) => $n->toArray(), $notes),
        ]);
    }
}
