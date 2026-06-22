<?php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:create-user',
    description: 'Créer un utilisateur du panel'
)]
class CreateUserCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Email')
            ->addArgument('prenom', InputArgument::REQUIRED, 'Prénom')
            ->addArgument('nom', InputArgument::REQUIRED, 'Nom')
            ->addArgument('password', InputArgument::REQUIRED, 'Mot de passe')
            ->addOption('admin', 'a', InputOption::VALUE_NONE, 'Créer un administrateur');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $existing = $this->em->getRepository(User::class)->findOneBy(['email' => $input->getArgument('email')]);
        if ($existing) {
            $io->error('Un utilisateur avec cet email existe déjà.');
            return Command::FAILURE;
        }

        $user = new User();
        $user->setEmail($input->getArgument('email'));
        $user->setPrenom($input->getArgument('prenom'));
        $user->setNom($input->getArgument('nom'));

        if ($input->getOption('admin')) {
            $user->setRoles(['ROLE_ADMIN']);
        }

        $hash = $this->hasher->hashPassword($user, $input->getArgument('password'));
        $user->setPassword($hash);

        $this->em->persist($user);
        $this->em->flush();

        $io->success(sprintf(
            'Utilisateur créé : %s %s <%s> [%s]',
            $user->getPrenom(),
            $user->getNom(),
            $user->getEmail(),
            implode(', ', $user->getRoles())
        ));

        return Command::SUCCESS;
    }
}
