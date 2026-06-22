<?php

namespace App\Entity;

use App\Repository\TagRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: TagRepository::class)]
class Tag
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50)]
    #[Assert\NotBlank]
    private ?string $nom = null;

    #[ORM\Column(length: 7)]
    private string $couleur = '#2E7A56';

    public function getId(): ?int { return $this->id; }
    public function getNom(): ?string { return $this->nom; }
    public function setNom(string $nom): static { $this->nom = $nom; return $this; }
    public function getCouleur(): string { return $this->couleur; }
    public function setCouleur(string $couleur): static { $this->couleur = $couleur; return $this; }

    public function toArray(): array
    {
        return ['id' => $this->id, 'nom' => $this->nom, 'couleur' => $this->couleur];
    }
}
