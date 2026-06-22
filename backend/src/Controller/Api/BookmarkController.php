<?php

namespace App\Controller\Api;

use App\Entity\Bookmark;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/bookmarks')]
#[IsGranted('ROLE_EMPLOYEE')]
class BookmarkController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    #[Route('', name: 'api_bookmarks_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $bookmarks = $this->em->getRepository(Bookmark::class)->findBy([], ['ordre' => 'ASC', 'categorie' => 'ASC']);
        return $this->json(array_map(fn(Bookmark $b) => $b->toArray(), $bookmarks));
    }

    #[Route('', name: 'api_bookmarks_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $bookmark = new Bookmark();
        $bookmark->setNom($data['nom'] ?? '');
        $bookmark->setUrl($data['url'] ?? '');
        $bookmark->setCategorie($data['categorie'] ?: null);
        $bookmark->setDescription($data['description'] ?: null);

        $this->em->persist($bookmark);
        $this->em->flush();

        return $this->json($bookmark->toArray(), 201);
    }

    #[Route('/{id}', name: 'api_bookmarks_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $bookmark = $this->em->getRepository(Bookmark::class)->find($id);
        if (!$bookmark) {
            return $this->json(['message' => 'Raccourci introuvable.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['nom']))         $bookmark->setNom($data['nom']);
        if (isset($data['url']))         $bookmark->setUrl($data['url']);
        if (array_key_exists('categorie', $data))    $bookmark->setCategorie($data['categorie'] ?: null);
        if (array_key_exists('description', $data))  $bookmark->setDescription($data['description'] ?: null);

        $this->em->flush();
        return $this->json($bookmark->toArray());
    }

    #[Route('/{id}', name: 'api_bookmarks_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $bookmark = $this->em->getRepository(Bookmark::class)->find($id);
        if (!$bookmark) {
            return $this->json(['message' => 'Raccourci introuvable.'], 404);
        }

        $this->em->remove($bookmark);
        $this->em->flush();

        return $this->json(null, 204);
    }
}
