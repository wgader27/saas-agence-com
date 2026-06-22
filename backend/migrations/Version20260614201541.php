<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260614201541 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE board (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, nom VARCHAR(120) NOT NULL, description CLOB DEFAULT NULL, visibilite VARCHAR(30) DEFAULT \'equipe\' NOT NULL, couleur_fond VARCHAR(40) DEFAULT NULL, created_at DATETIME NOT NULL, proprietaire_id INTEGER NOT NULL, CONSTRAINT FK_58562B4776C50E4A FOREIGN KEY (proprietaire_id) REFERENCES "user" (id) NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_58562B4776C50E4A ON board (proprietaire_id)');
        $this->addSql('CREATE TABLE board_column (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, nom VARCHAR(80) NOT NULL, couleur VARCHAR(20) DEFAULT NULL, ordre INTEGER DEFAULT 0 NOT NULL, board_id INTEGER NOT NULL, CONSTRAINT FK_D14DC3D9E7EC5785 FOREIGN KEY (board_id) REFERENCES board (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_D14DC3D9E7EC5785 ON board_column (board_id)');
        $this->addSql('CREATE TABLE board_member (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, role VARCHAR(20) DEFAULT \'editor\' NOT NULL, board_id INTEGER NOT NULL, user_id INTEGER NOT NULL, CONSTRAINT FK_DCFABEDFE7EC5785 FOREIGN KEY (board_id) REFERENCES board (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE, CONSTRAINT FK_DCFABEDFA76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_DCFABEDFE7EC5785 ON board_member (board_id)');
        $this->addSql('CREATE INDEX IDX_DCFABEDFA76ED395 ON board_member (user_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_DCFABEDFE7EC5785A76ED395 ON board_member (board_id, user_id)');
        $this->addSql('CREATE TABLE task (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, titre VARCHAR(255) NOT NULL, description CLOB DEFAULT NULL, couleur VARCHAR(20) DEFAULT NULL, ordre INTEGER DEFAULT 0 NOT NULL, date_echeance DATETIME DEFAULT NULL, jalon CLOB DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, column_id INTEGER NOT NULL, CONSTRAINT FK_527EDB25BE8E8ED5 FOREIGN KEY (column_id) REFERENCES board_column (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_527EDB25BE8E8ED5 ON task (column_id)');
        $this->addSql('CREATE TABLE task_assignee (task_id INTEGER NOT NULL, user_id INTEGER NOT NULL, PRIMARY KEY (task_id, user_id), CONSTRAINT FK_3C5D16408DB60186 FOREIGN KEY (task_id) REFERENCES task (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE, CONSTRAINT FK_3C5D1640A76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_3C5D16408DB60186 ON task_assignee (task_id)');
        $this->addSql('CREATE INDEX IDX_3C5D1640A76ED395 ON task_assignee (user_id)');
        $this->addSql('CREATE TABLE task_label_assignment (task_id INTEGER NOT NULL, task_label_id INTEGER NOT NULL, PRIMARY KEY (task_id, task_label_id), CONSTRAINT FK_72DAE5798DB60186 FOREIGN KEY (task_id) REFERENCES task (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE, CONSTRAINT FK_72DAE5797379C575 FOREIGN KEY (task_label_id) REFERENCES task_label (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_72DAE5798DB60186 ON task_label_assignment (task_id)');
        $this->addSql('CREATE INDEX IDX_72DAE5797379C575 ON task_label_assignment (task_label_id)');
        $this->addSql('CREATE TABLE task_checklist_item (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, texte VARCHAR(255) NOT NULL, checked BOOLEAN DEFAULT 0 NOT NULL, ordre INTEGER DEFAULT 0 NOT NULL, task_id INTEGER NOT NULL, CONSTRAINT FK_85C256568DB60186 FOREIGN KEY (task_id) REFERENCES task (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_85C256568DB60186 ON task_checklist_item (task_id)');
        $this->addSql('CREATE TABLE task_label (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, nom VARCHAR(50) NOT NULL, couleur VARCHAR(20) NOT NULL, board_id INTEGER NOT NULL, CONSTRAINT FK_C9034BC8E7EC5785 FOREIGN KEY (board_id) REFERENCES board (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_C9034BC8E7EC5785 ON task_label (board_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE board');
        $this->addSql('DROP TABLE board_column');
        $this->addSql('DROP TABLE board_member');
        $this->addSql('DROP TABLE task');
        $this->addSql('DROP TABLE task_assignee');
        $this->addSql('DROP TABLE task_label_assignment');
        $this->addSql('DROP TABLE task_checklist_item');
        $this->addSql('DROP TABLE task_label');
    }
}
