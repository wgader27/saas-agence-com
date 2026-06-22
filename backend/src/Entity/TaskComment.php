<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'task_comment')]
class TaskComment
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Task::class, inversedBy: 'comments')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Task $task = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $auteur = null;

    // For client comments (not authenticated)
    #[ORM\Column(length: 120, nullable: true)]
    private ?string $auteurNom = null;

    #[ORM\Column(type: 'text')]
    private string $texte = '';

    #[ORM\Column(options: ['default' => false])]
    private bool $isClientComment = false;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getTask(): ?Task { return $this->task; }
    public function setTask(?Task $v): self { $this->task = $v; return $this; }
    public function getAuteur(): ?User { return $this->auteur; }
    public function setAuteur(?User $v): self { $this->auteur = $v; return $this; }
    public function getAuteurNom(): ?string { return $this->auteurNom; }
    public function setAuteurNom(?string $v): self { $this->auteurNom = $v; return $this; }
    public function getTexte(): string { return $this->texte; }
    public function setTexte(string $v): self { $this->texte = $v; return $this; }
    public function isClientComment(): bool { return $this->isClientComment; }
    public function setIsClientComment(bool $v): self { $this->isClientComment = $v; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function toArray(): array
    {
        return [
            'id'             => $this->id,
            'auteurId'       => $this->auteur?->getId(),
            'auteurNom'      => $this->auteur ? ($this->auteur->getPrenom() . ' ' . $this->auteur->getNom()) : ($this->auteurNom ?? 'Client'),
            'auteurPrenom'   => $this->auteur?->getPrenom() ?? $this->auteurNom ?? 'Client',
            'texte'          => $this->texte,
            'isClientComment'=> $this->isClientComment,
            'createdAt'      => $this->createdAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
