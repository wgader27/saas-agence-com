<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'task_checklist_item')]
class TaskChecklistItem
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Task::class, inversedBy: 'checklistItems')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Task $task = null;

    #[ORM\Column(length: 255)]
    private string $texte = '';

    #[ORM\Column(options: ['default' => false])]
    private bool $checked = false;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $ordre = 0;

    public function getId(): ?int { return $this->id; }
    public function getTask(): ?Task { return $this->task; }
    public function setTask(?Task $v): self { $this->task = $v; return $this; }
    public function getTexte(): string { return $this->texte; }
    public function setTexte(string $v): self { $this->texte = $v; return $this; }
    public function isChecked(): bool { return $this->checked; }
    public function setChecked(bool $v): self { $this->checked = $v; return $this; }
    public function getOrdre(): int { return $this->ordre; }
    public function setOrdre(int $v): self { $this->ordre = $v; return $this; }

    public function toArray(): array
    {
        return [
            'id'      => $this->id,
            'texte'   => $this->texte,
            'checked' => $this->checked,
            'ordre'   => $this->ordre,
        ];
    }
}
