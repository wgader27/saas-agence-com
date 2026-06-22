<?php

namespace App\Entity;

use App\Repository\NoteRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: NoteRepository::class)]
class Note
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $auteur = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    private ?string $titre = null;

    #[ORM\Column(type: 'text')]
    private string $contenu = '';

    #[ORM\Column(length: 10)]
    #[Assert\Choice(choices: ['prive', 'equipe', 'partage'])]
    private string $visibilite = 'equipe';

    #[ORM\ManyToMany(targetEntity: Tag::class)]
    private Collection $tags;

    #[ORM\ManyToMany(targetEntity: User::class)]
    #[ORM\JoinTable(name: 'note_shared_with')]
    private Collection $sharedWith;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->createdAt  = new \DateTimeImmutable();
        $this->updatedAt  = new \DateTimeImmutable();
        $this->tags       = new ArrayCollection();
        $this->sharedWith = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }

    public function getAuteur(): ?User { return $this->auteur; }
    public function setAuteur(?User $auteur): static { $this->auteur = $auteur; return $this; }

    public function getTitre(): ?string { return $this->titre; }
    public function setTitre(string $titre): static { $this->titre = $titre; return $this; }

    public function getContenu(): string { return $this->contenu; }
    public function setContenu(string $contenu): static { $this->contenu = $contenu; return $this; }

    public function getVisibilite(): string { return $this->visibilite; }
    public function setVisibilite(string $visibilite): static { $this->visibilite = $visibilite; return $this; }

    public function getTags(): Collection { return $this->tags; }
    public function getSharedWith(): Collection { return $this->sharedWith; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static { $this->updatedAt = $updatedAt; return $this; }

    public function toArray(): array
    {
        return [
            'id'           => $this->id,
            'auteurId'     => $this->auteur?->getId(),
            'auteurNom'    => $this->auteur ? $this->auteur->getPrenom() . ' ' . $this->auteur->getNom() : '',
            'titre'        => $this->titre,
            'contenu'      => $this->contenu,
            'visibilite'   => $this->visibilite,
            'tags'         => $this->tags->map(fn(Tag $t) => $t->toArray())->toArray(),
            'sharedWithIds' => $this->sharedWith->map(fn(User $u) => $u->getId())->toArray(),
            'createdAt'    => $this->createdAt->format(\DateTimeInterface::ATOM),
            'updatedAt'    => $this->updatedAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
