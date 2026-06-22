<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'workspace')]
class Workspace
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 120)]
    private string $nom = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $couleur = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $proprietaire = null;

    #[ORM\OneToMany(targetEntity: WorkspaceMember::class, mappedBy: 'workspace', cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $members;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->members   = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getNom(): string { return $this->nom; }
    public function setNom(string $v): self { $this->nom = $v; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): self { $this->description = $v; return $this; }
    public function getCouleur(): ?string { return $this->couleur; }
    public function setCouleur(?string $v): self { $this->couleur = $v; return $this; }
    public function getProprietaire(): ?User { return $this->proprietaire; }
    public function setProprietaire(?User $v): self { $this->proprietaire = $v; return $this; }
    public function getMembers(): Collection { return $this->members; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function toArray(): array
    {
        return [
            'id'          => $this->id,
            'nom'         => $this->nom,
            'description' => $this->description,
            'couleur'     => $this->couleur ?? '#5243AA',
            'proprietaire'=> $this->proprietaire?->toArray(),
            'members'     => $this->members->map(fn(WorkspaceMember $m) => $m->toArray())->toArray(),
            'createdAt'   => $this->createdAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
