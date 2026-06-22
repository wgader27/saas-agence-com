<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'board')]
class Board
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 120)]
    private string $nom = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column(length: 30, options: ['default' => 'equipe'])]
    private string $visibilite = 'equipe'; // prive | equipe | partage

    #[ORM\Column(length: 512, nullable: true)]
    private ?string $couleurFond = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $proprietaire = null;

    #[ORM\ManyToOne(targetEntity: Workspace::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Workspace $workspace = null;

    #[ORM\ManyToOne(targetEntity: Client::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Client $clientAssocie = null;

    // Share link
    #[ORM\Column(length: 64, nullable: true, unique: true)]
    private ?string $shareToken = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $shareEnabled = false;

    #[ORM\OneToMany(targetEntity: BoardMember::class, mappedBy: 'board', cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $members;

    #[ORM\OneToMany(targetEntity: BoardColumn::class, mappedBy: 'board', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['ordre' => 'ASC'])]
    private Collection $columns;

    #[ORM\OneToMany(targetEntity: TaskLabel::class, mappedBy: 'board', cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $labels;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->members   = new ArrayCollection();
        $this->columns   = new ArrayCollection();
        $this->labels    = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getNom(): string { return $this->nom; }
    public function setNom(string $v): self { $this->nom = $v; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): self { $this->description = $v; return $this; }
    public function getVisibilite(): string { return $this->visibilite; }
    public function setVisibilite(string $v): self { $this->visibilite = $v; return $this; }
    public function getCouleurFond(): ?string { return $this->couleurFond; }
    public function setCouleurFond(?string $v): self { $this->couleurFond = $v; return $this; }
    public function getProprietaire(): ?User { return $this->proprietaire; }
    public function setProprietaire(?User $v): self { $this->proprietaire = $v; return $this; }
    public function getWorkspace(): ?Workspace { return $this->workspace; }
    public function setWorkspace(?Workspace $v): self { $this->workspace = $v; return $this; }
    public function getClientAssocie(): ?Client { return $this->clientAssocie; }
    public function setClientAssocie(?Client $v): self { $this->clientAssocie = $v; return $this; }
    public function getShareToken(): ?string { return $this->shareToken; }
    public function setShareToken(?string $v): self { $this->shareToken = $v; return $this; }
    public function isShareEnabled(): bool { return $this->shareEnabled; }
    public function setShareEnabled(bool $v): self { $this->shareEnabled = $v; return $this; }
    public function getMembers(): Collection { return $this->members; }
    public function getColumns(): Collection { return $this->columns; }
    public function getLabels(): Collection { return $this->labels; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function generateShareToken(): void
    {
        $this->shareToken = bin2hex(random_bytes(32));
    }

    public function toArray(): array
    {
        return [
            'id'            => $this->id,
            'nom'           => $this->nom,
            'description'   => $this->description,
            'visibilite'    => $this->visibilite,
            'couleurFond'   => $this->couleurFond ?? '#0052CC',
            'proprietaire'  => $this->proprietaire?->toArray(),
            'workspaceId'   => $this->workspace?->getId(),
            'workspaceNom'  => $this->workspace?->getNom(),
            'clientAssocie' => $this->clientAssocie ? ['id' => $this->clientAssocie->getId(), 'nom' => $this->clientAssocie->getNom()] : null,
            'shareEnabled'  => $this->shareEnabled,
            'shareToken'    => $this->shareEnabled ? $this->shareToken : null,
            'members'       => $this->members->map(fn(BoardMember $m) => $m->toArray())->toArray(),
            'createdAt'     => $this->createdAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
