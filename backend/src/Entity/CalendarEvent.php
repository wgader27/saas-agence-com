<?php

namespace App\Entity;

use App\Repository\CalendarEventRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: CalendarEventRepository::class)]
class CalendarEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    private ?string $titre = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $date = null;

    #[ORM\Column(type: 'boolean', options: ['default' => true])]
    private bool $allDay = true;

    #[ORM\Column(length: 5, nullable: true)]
    private ?string $heureDebut = null;

    #[ORM\Column(length: 5, nullable: true)]
    private ?string $heureFin = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $couleur = null;

    public function getId(): ?int { return $this->id; }
    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }
    public function getTitre(): ?string { return $this->titre; }
    public function setTitre(string $titre): static { $this->titre = $titre; return $this; }
    public function getDate(): ?\DateTimeImmutable { return $this->date; }
    public function setDate(\DateTimeImmutable $date): static { $this->date = $date; return $this; }
    public function isAllDay(): bool { return $this->allDay; }
    public function setAllDay(bool $allDay): static { $this->allDay = $allDay; return $this; }
    public function getHeureDebut(): ?string { return $this->heureDebut; }
    public function setHeureDebut(?string $heureDebut): static { $this->heureDebut = $heureDebut; return $this; }
    public function getHeureFin(): ?string { return $this->heureFin; }
    public function setHeureFin(?string $heureFin): static { $this->heureFin = $heureFin; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): static { $this->description = $description; return $this; }
    public function getCouleur(): ?string { return $this->couleur; }
    public function setCouleur(?string $couleur): static { $this->couleur = $couleur; return $this; }

    public function toArray(): array
    {
        return [
            'id'          => $this->id,
            'userId'      => $this->user?->getId(),
            'userNom'     => $this->user ? $this->user->getPrenom() . ' ' . $this->user->getNom() : null,
            'titre'       => $this->titre,
            'date'        => $this->date?->format('Y-m-d'),
            'allDay'      => $this->allDay,
            'heureDebut'  => $this->heureDebut,
            'heureFin'    => $this->heureFin,
            'description' => $this->description,
            'couleur'     => $this->couleur ?? '#3B82F6',
        ];
    }
}
