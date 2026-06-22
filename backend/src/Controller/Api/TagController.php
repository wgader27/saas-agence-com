<?php

namespace App\Controller\Api;

use App\Entity\Tag;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/tags')]
#[IsGranted('ROLE_EMPLOYEE')]
class TagController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    #[Route('', name: 'api_tags_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $tags = $this->em->getRepository(Tag::class)->findBy([], ['nom' => 'ASC']);
        return $this->json(array_map(fn(Tag $t) => $t->toArray(), $tags));
    }

    #[Route('', name: 'api_tags_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $tag = new Tag();
        $tag->setNom($data['nom'] ?? '');
        $tag->setCouleur($data['couleur'] ?? '#3B82F6');

        $this->em->persist($tag);
        $this->em->flush();

        return $this->json($tag->toArray(), 201);
    }

    #[Route('/{id}', name: 'api_tags_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $tag = $this->em->getRepository(Tag::class)->find($id);
        if (!$tag) {
            return $this->json(['message' => 'Tag introuvable.'], 404);
        }

        $this->em->remove($tag);
        $this->em->flush();

        return $this->json(null, 204);
    }
}
