<?php

namespace App\Entity;

use App\Repository\BookmarkRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: BookmarkRepository::class)]
class Bookmark
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 150)]
    #[Assert\NotBlank]
    private ?string $nom = null;

    #[ORM\Column(length: 2048)]
    #[Assert\NotBlank]
    #[Assert\Url]
    private ?string $url = null;

    #[ORM\Column(length: 2048, nullable: true)]
    private ?string $faviconUrl = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $categorie = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column]
    private int $ordre = 0;

    public function getId(): ?int { return $this->id; }
    public function getNom(): ?string { return $this->nom; }
    public function setNom(string $nom): static { $this->nom = $nom; return $this; }
    public function getUrl(): ?string { return $this->url; }
    public function setUrl(string $url): static { $this->url = $url; return $this; }
    public function getFaviconUrl(): ?string { return $this->faviconUrl; }
    public function setFaviconUrl(?string $faviconUrl): static { $this->faviconUrl = $faviconUrl; return $this; }
    public function getCategorie(): ?string { return $this->categorie; }
    public function setCategorie(?string $categorie): static { $this->categorie = $categorie; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): static { $this->description = $description; return $this; }
    public function getOrdre(): int { return $this->ordre; }
    public function setOrdre(int $ordre): static { $this->ordre = $ordre; return $this; }

    public function toArray(): array
    {
        return [
            'id'          => $this->id,
            'nom'         => $this->nom,
            'url'         => $this->url,
            'faviconUrl'  => $this->faviconUrl,
            'categorie'   => $this->categorie,
            'description' => $this->description,
            'ordre'       => $this->ordre,
        ];
    }
}
