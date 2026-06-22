<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'board_member')]
#[ORM\UniqueConstraint(columns: ['board_id', 'user_id'])]
class BoardMember
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Board::class, inversedBy: 'members')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Board $board = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\Column(length: 20, options: ['default' => 'editor'])]
    private string $role = 'editor'; // owner | editor | viewer

    public function getId(): ?int { return $this->id; }
    public function getBoard(): ?Board { return $this->board; }
    public function setBoard(?Board $v): self { $this->board = $v; return $this; }
    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $v): self { $this->user = $v; return $this; }
    public function getRole(): string { return $this->role; }
    public function setRole(string $v): self { $this->role = $v; return $this; }

    public function toArray(): array
    {
        return [
            'id'   => $this->id,
            'user' => $this->user?->toArray(),
            'role' => $this->role,
        ];
    }
}
