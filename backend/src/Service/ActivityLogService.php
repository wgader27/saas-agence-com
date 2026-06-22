<?php

namespace App\Service;

use App\Entity\ActivityLog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class ActivityLogService
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function log(User $user, string $action, ?string $cible = null): void
    {
        $log = new ActivityLog();
        $log->setUser($user);
        $log->setAction($action);
        $log->setCible($cible);

        $this->em->persist($log);
        $this->em->flush();
    }
}
