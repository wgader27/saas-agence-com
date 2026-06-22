<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'task')]
class Task
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: BoardColumn::class, inversedBy: 'tasks')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?BoardColumn $column = null;

    #[ORM\Column(length: 255)]
    private string $titre = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $couleur = null;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $ordre = 0;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $dateEcheance = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $jalon = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $clientValidated = false;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $clientValidatedAt = null;

    #[ORM\ManyToMany(targetEntity: User::class)]
    #[ORM\JoinTable(name: 'task_assignee')]
    private Collection $assignees;

    #[ORM\ManyToMany(targetEntity: TaskLabel::class)]
    #[ORM\JoinTable(name: 'task_label_assignment')]
    private Collection $labels;

    #[ORM\OneToMany(targetEntity: TaskChecklistItem::class, mappedBy: 'task', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['ordre' => 'ASC'])]
    private Collection $checklistItems;

    #[ORM\OneToMany(targetEntity: TaskComment::class, mappedBy: 'task', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['createdAt' => 'ASC'])]
    private Collection $comments;

    #[ORM\OneToMany(targetEntity: TaskAttachment::class, mappedBy: 'task', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['createdAt' => 'ASC'])]
    private Collection $attachments;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->assignees      = new ArrayCollection();
        $this->labels         = new ArrayCollection();
        $this->checklistItems = new ArrayCollection();
        $this->comments       = new ArrayCollection();
        $this->attachments    = new ArrayCollection();
        $this->createdAt      = new \DateTimeImmutable();
        $this->updatedAt      = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getColumn(): ?BoardColumn { return $this->column; }
    public function setColumn(?BoardColumn $v): self { $this->column = $v; return $this; }
    public function getTitre(): string { return $this->titre; }
    public function setTitre(string $v): self { $this->titre = $v; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): self { $this->description = $v; return $this; }
    public function getCouleur(): ?string { return $this->couleur; }
    public function setCouleur(?string $v): self { $this->couleur = $v; return $this; }
    public function getOrdre(): int { return $this->ordre; }
    public function setOrdre(int $v): self { $this->ordre = $v; return $this; }
    public function getDateEcheance(): ?\DateTimeImmutable { return $this->dateEcheance; }
    public function setDateEcheance(?\DateTimeImmutable $v): self { $this->dateEcheance = $v; return $this; }
    public function getJalon(): ?string { return $this->jalon; }
    public function setJalon(?string $v): self { $this->jalon = $v; return $this; }
    public function isClientValidated(): bool { return $this->clientValidated; }
    public function setClientValidated(bool $v): self { $this->clientValidated = $v; return $this; }
    public function getClientValidatedAt(): ?\DateTimeImmutable { return $this->clientValidatedAt; }
    public function setClientValidatedAt(?\DateTimeImmutable $v): self { $this->clientValidatedAt = $v; return $this; }
    public function getAssignees(): Collection { return $this->assignees; }
    public function getLabels(): Collection { return $this->labels; }
    public function getChecklistItems(): Collection { return $this->checklistItems; }
    public function getComments(): Collection { return $this->comments; }
    public function getAttachments(): Collection { return $this->attachments; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeImmutable $v): self { $this->updatedAt = $v; return $this; }

    public function toArray(bool $withDetails = false): array
    {
        $checklist = $this->checklistItems->toArray();
        $total     = count($checklist);
        $done      = count(array_filter($checklist, fn(TaskChecklistItem $i) => $i->isChecked()));

        $firstImage = $this->attachments->filter(fn(TaskAttachment $a) => $a->isImage())->first();

        $data = [
            'id'                 => $this->id,
            'columnId'           => $this->column?->getId(),
            'titre'              => $this->titre,
            'description'        => $this->description,
            'couleur'            => $this->couleur,
            'ordre'              => $this->ordre,
            'dateEcheance'       => $this->dateEcheance?->format('Y-m-d'),
            'jalon'              => $this->jalon,
            'clientValidated'    => $this->clientValidated,
            'clientValidatedAt'  => $this->clientValidatedAt?->format(\DateTimeInterface::ATOM),
            'assignees'          => $this->assignees->map(fn(User $u) => $u->toArray())->toArray(),
            'labels'             => $this->labels->map(fn(TaskLabel $l) => $l->toArray())->toArray(),
            'checklist'          => array_map(fn(TaskChecklistItem $i) => $i->toArray(), $checklist),
            'checklistMeta'      => ['total' => $total, 'done' => $done],
            'commentCount'       => count($this->comments),
            'attachmentCount'    => count($this->attachments),
            'coverUrl'           => $firstImage ? '/api/uploads/' . $firstImage->getNomFichier() : null,
            'createdAt'          => $this->createdAt->format(\DateTimeInterface::ATOM),
            'updatedAt'          => $this->updatedAt->format(\DateTimeInterface::ATOM),
        ];

        if ($withDetails) {
            $data['comments']    = $this->comments->map(fn(TaskComment $c) => $c->toArray())->toArray();
            $data['attachments'] = $this->attachments->map(fn(TaskAttachment $a) => $a->toArray())->toArray();
        }

        return $data;
    }
}
