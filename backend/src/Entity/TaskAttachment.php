<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'task_attachment')]
class TaskAttachment
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Task::class, inversedBy: 'attachments')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Task $task = null;

    #[ORM\Column(length: 255)]
    private string $nomOriginal = '';

    #[ORM\Column(length: 255)]
    private string $nomFichier = ''; // stored filename (UUID-based)

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $mimeType = null;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $taille = 0;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $uploadedBy = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getTask(): ?Task { return $this->task; }
    public function setTask(?Task $v): self { $this->task = $v; return $this; }
    public function getNomOriginal(): string { return $this->nomOriginal; }
    public function setNomOriginal(string $v): self { $this->nomOriginal = $v; return $this; }
    public function getNomFichier(): string { return $this->nomFichier; }
    public function setNomFichier(string $v): self { $this->nomFichier = $v; return $this; }
    public function getMimeType(): ?string { return $this->mimeType; }
    public function setMimeType(?string $v): self { $this->mimeType = $v; return $this; }
    public function getTaille(): int { return $this->taille; }
    public function setTaille(int $v): self { $this->taille = $v; return $this; }
    public function getUploadedBy(): ?User { return $this->uploadedBy; }
    public function setUploadedBy(?User $v): self { $this->uploadedBy = $v; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function isImage(): bool
    {
        return $this->mimeType !== null && str_starts_with($this->mimeType, 'image/');
    }

    public function toArray(): array
    {
        return [
            'id'           => $this->id,
            'nomOriginal'  => $this->nomOriginal,
            'nomFichier'   => $this->nomFichier,
            'mimeType'     => $this->mimeType,
            'taille'       => $this->taille,
            'isImage'      => $this->isImage(),
            'url'          => '/api/uploads/' . $this->nomFichier,
            'uploadedBy'   => $this->uploadedBy ? ($this->uploadedBy->getPrenom() . ' ' . $this->uploadedBy->getNom()) : null,
            'createdAt'    => $this->createdAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
