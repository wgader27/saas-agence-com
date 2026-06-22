<?php

namespace App\Controller\Api;

use App\Entity\CalendarEvent;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/calendar-events')]
#[IsGranted('ROLE_EMPLOYEE')]
class CalendarController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    #[Route('', name: 'api_events_list', methods: ['GET'])]
    public function list(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $year   = $request->query->getInt('year', (int) date('Y'));
        $month  = $request->query->getInt('month', (int) date('m'));
        $userId = $request->query->getInt('userId', $user->getId());

        $targetUser = $this->em->getRepository(User::class)->find($userId) ?? $user;

        $start = new \DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month));
        $end   = $start->modify('last day of this month')->setTime(23, 59, 59);

        $events = $this->em->getRepository(CalendarEvent::class)
            ->createQueryBuilder('e')
            ->where('e.user = :user')
            ->andWhere('e.date >= :start')
            ->andWhere('e.date <= :end')
            ->setParameter('user', $targetUser)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->orderBy('e.date', 'ASC')
            ->getQuery()
            ->getResult();

        return $this->json(array_map(fn(CalendarEvent $e) => $e->toArray(), $events));
    }

    #[Route('/users', name: 'api_events_users', methods: ['GET'])]
    public function users(): JsonResponse
    {
        $users = $this->em->getRepository(User::class)->findAll();
        return $this->json(array_map(fn(User $u) => $u->toArray(), $users));
    }

    #[Route('', name: 'api_events_create', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $event = new CalendarEvent();
        $event->setUser($user);
        $event->setTitre($data['titre'] ?? '');
        $event->setDate(new \DateTimeImmutable($data['date'] ?? 'now'));
        $event->setAllDay($data['allDay'] ?? true);
        $event->setHeureDebut($data['heureDebut'] ?? null);
        $event->setHeureFin($data['heureFin'] ?? null);
        $event->setDescription($data['description'] ?? null);
        $event->setCouleur($data['couleur'] ?? null);

        $this->em->persist($event);
        $this->em->flush();

        return $this->json($event->toArray(), 201);
    }

    #[Route('/{id}', name: 'api_events_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $event = $this->em->getRepository(CalendarEvent::class)->find($id);
        if (!$event || $event->getUser() !== $user) {
            return $this->json(['message' => 'Événement introuvable.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['titre']))       $event->setTitre($data['titre']);
        if (isset($data['date']))        $event->setDate(new \DateTimeImmutable($data['date']));
        if (isset($data['allDay']))      $event->setAllDay($data['allDay']);
        if (array_key_exists('heureDebut', $data)) $event->setHeureDebut($data['heureDebut']);
        if (array_key_exists('heureFin', $data))   $event->setHeureFin($data['heureFin']);
        if (array_key_exists('description', $data)) $event->setDescription($data['description']);
        if (isset($data['couleur']))     $event->setCouleur($data['couleur']);

        $this->em->flush();

        return $this->json($event->toArray());
    }

    #[Route('/{id}', name: 'api_events_delete', methods: ['DELETE'])]
    public function delete(int $id, #[CurrentUser] User $user): JsonResponse
    {
        $event = $this->em->getRepository(CalendarEvent::class)->find($id);
        if (!$event || $event->getUser() !== $user) {
            return $this->json(['message' => 'Événement introuvable.'], 404);
        }

        $this->em->remove($event);
        $this->em->flush();

        return $this->json(null, 204);
    }
}
