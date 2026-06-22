<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'notification')]
class Notification
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $destinataire = null;

    // comment | assignment | client_comment | client_validated
    #[ORM\Column(length: 40)]
    private string $type = 'comment';

    #[ORM\Column(length: 255)]
    private string $titre = '';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $contenu = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $lienUrl = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $lu = false;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getDestinataire(): ?User { return $this->destinataire; }
    public function setDestinataire(?User $v): self { $this->destinataire = $v; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $v): self { $this->type = $v; return $this; }
    public function getTitre(): string { return $this->titre; }
    public function setTitre(string $v): self { $this->titre = $v; return $this; }
    public function getContenu(): ?string { return $this->contenu; }
    public function setContenu(?string $v): self { $this->contenu = $v; return $this; }
    public function getLienUrl(): ?string { return $this->lienUrl; }
    public function setLienUrl(?string $v): self { $this->lienUrl = $v; return $this; }
    public function isLu(): bool { return $this->lu; }
    public function setLu(bool $v): self { $this->lu = $v; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function toArray(): array
    {
        return [
            'id'        => $this->id,
            'type'      => $this->type,
            'titre'     => $this->titre,
            'contenu'   => $this->contenu,
            'lienUrl'   => $this->lienUrl,
            'lu'        => $this->lu,
            'createdAt' => $this->createdAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
