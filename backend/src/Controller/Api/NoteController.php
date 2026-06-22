<?php

namespace App\Controller\Api;

use App\Entity\Note;
use App\Entity\Tag;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/notes')]
#[IsGranted('ROLE_EMPLOYEE')]
class NoteController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    #[Route('', name: 'api_notes_list', methods: ['GET'])]
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        $qb = $this->em->getRepository(Note::class)
            ->createQueryBuilder('n')
            ->leftJoin('n.auteur', 'a')
            ->leftJoin('n.sharedWith', 'sw')
            ->orderBy('n.updatedAt', 'DESC');

        if (!$this->isGranted('ROLE_ADMIN')) {
            $qb->where(
                $qb->expr()->orX(
                    $qb->expr()->eq('n.visibilite', ':eq'),
                    $qb->expr()->eq('n.auteur', ':user'),
                    $qb->expr()->eq('sw', ':user'),
                )
            )
            ->setParameter('eq', 'equipe')
            ->setParameter('user', $user);
        }

        $notes = $qb->getQuery()->getResult();

        return $this->json(array_map(fn(Note $n) => $n->toArray(), $notes));
    }

    #[Route('', name: 'api_notes_create', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $note = new Note();
        $note->setAuteur($user);
        $note->setTitre($data['titre'] ?? '');
        $note->setContenu($data['contenu'] ?? '');
        $note->setVisibilite($data['visibilite'] ?? 'equipe');

        $this->em->persist($note);
        $this->em->flush();

        return $this->json($note->toArray(), 201);
    }

    #[Route('/{id}', name: 'api_notes_update', methods: ['PUT', 'PATCH'], requirements: ['id' => '\d+'])]
    public function update(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $note = $this->em->getRepository(Note::class)->find($id);
        if (!$note) {
            return $this->json(['message' => 'Note introuvable.'], 404);
        }

        if ($note->getAuteur() !== $user && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(['message' => 'Accès refusé.'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['titre']))      $note->setTitre($data['titre']);
        if (isset($data['contenu']))    $note->setContenu($data['contenu']);
        if (isset($data['visibilite'])) $note->setVisibilite($data['visibilite']);
        $note->setUpdatedAt(new \DateTimeImmutable());

        $this->em->flush();

        return $this->json($note->toArray());
    }

    #[Route('/{id}', name: 'api_notes_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id, #[CurrentUser] User $user): JsonResponse
    {
        $note = $this->em->getRepository(Note::class)->find($id);
        if (!$note) {
            return $this->json(['message' => 'Note introuvable.'], 404);
        }

        if ($note->getAuteur() !== $user && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(['message' => 'Accès refusé.'], 403);
        }

        $this->em->remove($note);
        $this->em->flush();

        return $this->json(null, 204);
    }

    /** Attach a tag to a note */
    #[Route('/{id}/tags/{tagId}', name: 'api_notes_tag_add', methods: ['POST'], requirements: ['id' => '\d+', 'tagId' => '\d+'])]
    public function addTag(int $id, int $tagId, #[CurrentUser] User $user): JsonResponse
    {
        $note = $this->em->getRepository(Note::class)->find($id);
        if (!$note) return $this->json(['message' => 'Note introuvable.'], 404);

        if ($note->getAuteur() !== $user && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(['message' => 'Accès refusé.'], 403);
        }

        $tag = $this->em->getRepository(Tag::class)->find($tagId);
        if (!$tag) return $this->json(['message' => 'Tag introuvable.'], 404);

        if (!$note->getTags()->contains($tag)) {
            $note->getTags()->add($tag);
            $note->setUpdatedAt(new \DateTimeImmutable());
            $this->em->flush();
        }

        return $this->json($note->toArray());
    }

    /** Detach a tag from a note */
    #[Route('/{id}/tags/{tagId}', name: 'api_notes_tag_remove', methods: ['DELETE'], requirements: ['id' => '\d+', 'tagId' => '\d+'])]
    public function removeTag(int $id, int $tagId, #[CurrentUser] User $user): JsonResponse
    {
        $note = $this->em->getRepository(Note::class)->find($id);
        if (!$note) return $this->json(['message' => 'Note introuvable.'], 404);

        if ($note->getAuteur() !== $user && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(['message' => 'Accès refusé.'], 403);
        }

        $tag = $this->em->getRepository(Tag::class)->find($tagId);
        if ($tag && $note->getTags()->contains($tag)) {
            $note->getTags()->removeElement($tag);
            $note->setUpdatedAt(new \DateTimeImmutable());
            $this->em->flush();
        }

        return $this->json($note->toArray());
    }

    /** Share a private note with specific users */
    #[Route('/{id}/share', name: 'api_notes_share', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function share(int $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $note = $this->em->getRepository(Note::class)->find($id);
        if (!$note) return $this->json(['message' => 'Note introuvable.'], 404);

        if ($note->getAuteur() !== $user && !$this->isGranted('ROLE_ADMIN')) {
            return $this->json(['message' => 'Accès refusé.'], 403);
        }

        $data    = json_decode($request->getContent(), true) ?? [];
        $userIds = $data['userIds'] ?? [];

        $note->getSharedWith()->clear();

        foreach ($userIds as $uid) {
            $u = $this->em->getRepository(User::class)->find((int) $uid);
            if ($u && $u->getId() !== $user->getId()) {
                $note->getSharedWith()->add($u);
            }
        }

        $note->setVisibilite($note->getSharedWith()->isEmpty() ? 'prive' : 'partage');
        $note->setUpdatedAt(new \DateTimeImmutable());
        $this->em->flush();

        return $this->json($note->toArray());
    }
}
