<?php

namespace App\Entity;

use App\Repository\SiteAccessRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: SiteAccessRepository::class)]
class SiteAccess
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Client::class, inversedBy: 'siteAccesses')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Client $client = null;

    #[ORM\Column(length: 30)]
    #[Assert\Choice(choices: ['hebergement', 'wordpress', 'autre'])]
    private string $type = 'hebergement';

    #[ORM\Column(length: 150)]
    #[Assert\NotBlank]
    private ?string $label = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $url = null;

    /** Stocké chiffré */
    #[ORM\Column(type: 'text')]
    private ?string $login = null;

    /** Stocké chiffré */
    #[ORM\Column(type: 'text')]
    private ?string $password = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $notes = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getClient(): ?Client { return $this->client; }
    public function setClient(?Client $client): static { $this->client = $client; return $this; }

    public function getType(): string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }

    public function getLabel(): ?string { return $this->label; }
    public function setLabel(string $label): static { $this->label = $label; return $this; }

    public function getUrl(): ?string { return $this->url; }
    public function setUrl(?string $url): static { $this->url = $url; return $this; }

    public function getLogin(): ?string { return $this->login; }
    public function setLogin(?string $login): static { $this->login = $login; return $this; }

    public function getPassword(): ?string { return $this->password; }
    public function setPassword(?string $password): static { $this->password = $password; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $notes): static { $this->notes = $notes; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function toArray(string $decryptedLogin, string $decryptedPassword): array
    {
        return [
            'id'       => $this->id,
            'clientId' => $this->client?->getId(),
            'clientNom'=> $this->client?->getNom(),
            'type'     => $this->type,
            'label'    => $this->label,
            'url'      => $this->url,
            'login'    => $decryptedLogin,
            'password' => $decryptedPassword,
            'notes'    => $this->notes,
        ];
    }
}
