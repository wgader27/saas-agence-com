<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260614180802 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE calendar_event ADD COLUMN all_day BOOLEAN DEFAULT 1 NOT NULL');
        $this->addSql('ALTER TABLE calendar_event ADD COLUMN heure_debut VARCHAR(5) DEFAULT NULL');
        $this->addSql('ALTER TABLE calendar_event ADD COLUMN heure_fin VARCHAR(5) DEFAULT NULL');
        $this->addSql('ALTER TABLE calendar_event ADD COLUMN couleur VARCHAR(20) DEFAULT NULL');
        $this->addSql('ALTER TABLE client ADD COLUMN telephone VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE client ADD COLUMN email VARCHAR(150) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TEMPORARY TABLE __temp__calendar_event AS SELECT id, titre, date, description, user_id FROM calendar_event');
        $this->addSql('DROP TABLE calendar_event');
        $this->addSql('CREATE TABLE calendar_event (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, titre VARCHAR(255) NOT NULL, date DATETIME NOT NULL, description CLOB DEFAULT NULL, user_id INTEGER NOT NULL, CONSTRAINT FK_57FA09C9A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('INSERT INTO calendar_event (id, titre, date, description, user_id) SELECT id, titre, date, description, user_id FROM __temp__calendar_event');
        $this->addSql('DROP TABLE __temp__calendar_event');
        $this->addSql('CREATE INDEX IDX_57FA09C9A76ED395 ON calendar_event (user_id)');
        $this->addSql('CREATE TEMPORARY TABLE __temp__client AS SELECT id, nom, secteur, contact, notes_generales, created_at FROM client');
        $this->addSql('DROP TABLE client');
        $this->addSql('CREATE TABLE client (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, nom VARCHAR(150) NOT NULL, secteur VARCHAR(100) DEFAULT NULL, contact VARCHAR(200) DEFAULT NULL, notes_generales CLOB DEFAULT NULL, created_at DATETIME NOT NULL)');
        $this->addSql('INSERT INTO client (id, nom, secteur, contact, notes_generales, created_at) SELECT id, nom, secteur, contact, notes_generales, created_at FROM __temp__client');
        $this->addSql('DROP TABLE __temp__client');
    }
}
