<?php

namespace App\Controller\Api;

use App\Entity\Notification;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/notifications')]
#[IsGranted('ROLE_EMPLOYEE')]
class NotificationController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    #[Route('', name: 'api_notifications_list', methods: ['GET'])]
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        $notifications = $this->em->getRepository(Notification::class)->findBy(
            ['destinataire' => $user],
            ['createdAt' => 'DESC'],
            50
        );

        $unreadCount = $this->em->getRepository(Notification::class)->count([
            'destinataire' => $user,
            'lu'           => false,
        ]);

        return $this->json([
            'notifications' => array_map(fn(Notification $n) => $n->toArray(), $notifications),
            'unreadCount'   => $unreadCount,
        ]);
    }

    #[Route('/{id}/read', name: 'api_notifications_read', methods: ['PATCH'])]
    public function markRead(int $id, #[CurrentUser] User $user): JsonResponse
    {
        $notif = $this->em->getRepository(Notification::class)->find($id);
        if (!$notif || $notif->getDestinataire() !== $user) {
            return $this->json(['message' => 'Non trouvé.'], 404);
        }

        $notif->setLu(true);
        $this->em->flush();
        return $this->json($notif->toArray());
    }

    #[Route('/read-all', name: 'api_notifications_read_all', methods: ['POST'])]
    public function markAllRead(#[CurrentUser] User $user): JsonResponse
    {
        $this->em->createQueryBuilder()
            ->update(Notification::class, 'n')
            ->set('n.lu', ':true')
            ->where('n.destinataire = :user AND n.lu = :false')
            ->setParameter('true', true)
            ->setParameter('false', false)
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();

        return $this->json(['ok' => true]);
    }

    #[Route('/{id}', name: 'api_notifications_delete', methods: ['DELETE'])]
    public function delete(int $id, #[CurrentUser] User $user): JsonResponse
    {
        $notif = $this->em->getRepository(Notification::class)->find($id);
        if (!$notif || $notif->getDestinataire() !== $user) {
            return $this->json(['message' => 'Non trouvé.'], 404);
        }

        $this->em->remove($notif);
        $this->em->flush();
        return $this->json(null, 204);
    }
}
