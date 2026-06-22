<?php

namespace App\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:generate-encryption-key',
    description: 'Générer une clé de chiffrement sécurisée pour APP_ENCRYPTION_KEY'
)]
class GenerateEncryptionKeyCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io  = new SymfonyStyle($input, $output);
        $key = sodium_bin2hex(random_bytes(SODIUM_CRYPTO_SECRETBOX_KEYBYTES));

        $io->title('Clé de chiffrement générée');
        $io->text('Ajoutez cette ligne dans votre <comment>.env.local</comment> :');
        $io->newLine();
        $io->writeln("APP_ENCRYPTION_KEY={$key}");
        $io->newLine();
        $io->warning('Ne commitez JAMAIS cette clé dans votre dépôt Git.');

        return Command::SUCCESS;
    }
}
