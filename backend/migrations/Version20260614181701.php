<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260614181701 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE bookmark ADD COLUMN description CLOB DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TEMPORARY TABLE __temp__bookmark AS SELECT id, nom, url, favicon_url, categorie, ordre FROM bookmark');
        $this->addSql('DROP TABLE bookmark');
        $this->addSql('CREATE TABLE bookmark (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, nom VARCHAR(150) NOT NULL, url VARCHAR(2048) NOT NULL, favicon_url VARCHAR(2048) DEFAULT NULL, categorie VARCHAR(100) DEFAULT NULL, ordre INTEGER NOT NULL)');
        $this->addSql('INSERT INTO bookmark (id, nom, url, favicon_url, categorie, ordre) SELECT id, nom, url, favicon_url, categorie, ordre FROM __temp__bookmark');
        $this->addSql('DROP TABLE __temp__bookmark');
    }
}
