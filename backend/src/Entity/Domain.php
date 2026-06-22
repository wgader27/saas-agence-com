<?php

namespace App\Entity;

use App\Repository\DomainRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: DomainRepository::class)]
class Domain
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Client::class, inversedBy: 'domains')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Client $client = null;

    #[ORM\Column(length: 253)]
    #[Assert\NotBlank]
    private ?string $nomDomaine = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $registrar = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $hebergeur = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $dateExpirationDomaine = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $dateExpirationSsl = null;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getClient(): ?Client { return $this->client; }
    public function setClient(?Client $client): static { $this->client = $client; return $this; }

    public function getNomDomaine(): ?string { return $this->nomDomaine; }
    public function setNomDomaine(string $nomDomaine): static { $this->nomDomaine = $nomDomaine; return $this; }

    public function getRegistrar(): ?string { return $this->registrar; }
    public function setRegistrar(?string $registrar): static { $this->registrar = $registrar; return $this; }

    public function getHebergeur(): ?string { return $this->hebergeur; }
    public function setHebergeur(?string $hebergeur): static { $this->hebergeur = $hebergeur; return $this; }

    public function getDateExpirationDomaine(): ?\DateTimeImmutable { return $this->dateExpirationDomaine; }
    public function setDateExpirationDomaine(?\DateTimeImmutable $date): static { $this->dateExpirationDomaine = $date; return $this; }

    public function getDateExpirationSsl(): ?\DateTimeImmutable { return $this->dateExpirationSsl; }
    public function setDateExpirationSsl(?\DateTimeImmutable $date): static { $this->dateExpirationSsl = $date; return $this; }

    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeImmutable $updatedAt): static { $this->updatedAt = $updatedAt; return $this; }

    public function toArray(): array
    {
        return [
            'id'                     => $this->id,
            'clientId'               => $this->client?->getId(),
            'clientNom'              => $this->client?->getNom() ?? '',
            'nomDomaine'             => $this->nomDomaine,
            'registrar'              => $this->registrar,
            'hebergeur'              => $this->hebergeur,
            'dateExpirationDomaine'  => $this->dateExpirationDomaine?->format('Y-m-d'),
            'dateExpirationSsl'      => $this->dateExpirationSsl?->format('Y-m-d'),
        ];
    }
}
