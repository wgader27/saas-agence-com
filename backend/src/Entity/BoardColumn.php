<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'board_column')]
class BoardColumn
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Board::class, inversedBy: 'columns')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Board $board = null;

    #[ORM\Column(length: 80)]
    private string $nom = '';

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $couleur = null;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $ordre = 0;

    #[ORM\OneToMany(targetEntity: Task::class, mappedBy: 'column', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['ordre' => 'ASC'])]
    private Collection $tasks;

    public function __construct()
    {
        $this->tasks = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getBoard(): ?Board { return $this->board; }
    public function setBoard(?Board $v): self { $this->board = $v; return $this; }
    public function getNom(): string { return $this->nom; }
    public function setNom(string $v): self { $this->nom = $v; return $this; }
    public function getCouleur(): ?string { return $this->couleur; }
    public function setCouleur(?string $v): self { $this->couleur = $v; return $this; }
    public function getOrdre(): int { return $this->ordre; }
    public function setOrdre(int $v): self { $this->ordre = $v; return $this; }
    public function getTasks(): Collection { return $this->tasks; }

    public function toArray(bool $withTasks = false): array
    {
        $data = [
            'id'      => $this->id,
            'nom'     => $this->nom,
            'couleur' => $this->couleur,
            'ordre'   => $this->ordre,
        ];
        if ($withTasks) {
            $data['tasks'] = $this->tasks->map(fn(Task $t) => $t->toArray())->toArray();
        }
        return $data;
    }
}
