<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260614220000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add note_shared_with pivot table for note sharing';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE note_shared_with (note_id INTEGER NOT NULL, user_id INTEGER NOT NULL, PRIMARY KEY (note_id, user_id), CONSTRAINT FK_NOTE_SHARED_NOTE FOREIGN KEY (note_id) REFERENCES note (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE, CONSTRAINT FK_NOTE_SHARED_USER FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_NOTE_SHARED_NOTE ON note_shared_with (note_id)');
        $this->addSql('CREATE INDEX IDX_NOTE_SHARED_USER ON note_shared_with (user_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE note_shared_with');
    }
}
