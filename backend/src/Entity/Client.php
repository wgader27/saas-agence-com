<?php

namespace App\Entity;

use App\Repository\ClientRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ClientRepository::class)]
class Client
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 150)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 150)]
    private ?string $nom = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $secteur = null;

    #[ORM\Column(length: 200, nullable: true)]
    private ?string $contact = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $telephone = null;

    #[ORM\Column(length: 150, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $notesGenerales = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\OneToMany(targetEntity: SiteAccess::class, mappedBy: 'client', cascade: ['remove'])]
    private Collection $siteAccesses;

    #[ORM\OneToMany(targetEntity: Domain::class, mappedBy: 'client', cascade: ['remove'])]
    private Collection $domains;

    public function __construct()
    {
        $this->createdAt    = new \DateTimeImmutable();
        $this->siteAccesses = new ArrayCollection();
        $this->domains      = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }

    public function getNom(): ?string { return $this->nom; }
    public function setNom(string $nom): static { $this->nom = $nom; return $this; }

    public function getSecteur(): ?string { return $this->secteur; }
    public function setSecteur(?string $secteur): static { $this->secteur = $secteur; return $this; }

    public function getContact(): ?string { return $this->contact; }
    public function setContact(?string $contact): static { $this->contact = $contact; return $this; }

    public function getTelephone(): ?string { return $this->telephone; }
    public function setTelephone(?string $telephone): static { $this->telephone = $telephone; return $this; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): static { $this->email = $email; return $this; }

    public function getNotesGenerales(): ?string { return $this->notesGenerales; }
    public function setNotesGenerales(?string $v): static { $this->notesGenerales = $v; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function getSiteAccesses(): Collection { return $this->siteAccesses; }
    public function getDomains(): Collection { return $this->domains; }

    public function toArray(): array
    {
        return [
            'id'             => $this->id,
            'nom'            => $this->nom,
            'secteur'        => $this->secteur,
            'contact'        => $this->contact,
            'telephone'      => $this->telephone,
            'email'          => $this->email,
            'notesGenerales' => $this->notesGenerales,
            'createdAt'      => $this->createdAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
