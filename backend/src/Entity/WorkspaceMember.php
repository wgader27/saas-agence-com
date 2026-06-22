<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'workspace_member')]
#[ORM\UniqueConstraint(name: 'uniq_workspace_user', columns: ['workspace_id', 'user_id'])]
class WorkspaceMember
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Workspace::class, inversedBy: 'members')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Workspace $workspace = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 20, options: ['default' => 'member'])]
    private string $role = 'member'; // admin | member

    #[ORM\Column]
    private \DateTimeImmutable $joinedAt;

    public function __construct()
    {
        $this->joinedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getWorkspace(): ?Workspace { return $this->workspace; }
    public function setWorkspace(?Workspace $v): self { $this->workspace = $v; return $this; }
    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $v): self { $this->user = $v; return $this; }
    public function getRole(): string { return $this->role; }
    public function setRole(string $v): self { $this->role = $v; return $this; }
    public function getJoinedAt(): \DateTimeImmutable { return $this->joinedAt; }

    public function toArray(): array
    {
        return [
            'id'       => $this->id,
            'user'     => $this->user?->toArray(),
            'role'     => $this->role,
            'joinedAt' => $this->joinedAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
