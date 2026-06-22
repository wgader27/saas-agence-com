<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'task_label')]
class TaskLabel
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Board::class, inversedBy: 'labels')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Board $board = null;

    #[ORM\Column(length: 50)]
    private string $nom = '';

    #[ORM\Column(length: 20)]
    private string $couleur = '#61BD4F';

    public function getId(): ?int { return $this->id; }
    public function getBoard(): ?Board { return $this->board; }
    public function setBoard(?Board $v): self { $this->board = $v; return $this; }
    public function getNom(): string { return $this->nom; }
    public function setNom(string $v): self { $this->nom = $v; return $this; }
    public function getCouleur(): string { return $this->couleur; }
    public function setCouleur(string $v): self { $this->couleur = $v; return $this; }

    public function toArray(): array
    {
        return ['id' => $this->id, 'nom' => $this->nom, 'couleur' => $this->couleur];
    }
}
