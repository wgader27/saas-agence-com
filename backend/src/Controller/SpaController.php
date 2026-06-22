<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Sert l'application React pour toutes les routes qui ne sont pas /api/*.
 * Le build Vite doit se trouver dans public/app/index.html.
 */
class SpaController extends AbstractController
{
    #[Route('/{reactRouting}', name: 'spa', requirements: ['reactRouting' => '^(?!api).*'], defaults: ['reactRouting' => ''])]
    public function index(): Response
    {
        $indexFile = $this->getParameter('kernel.project_dir') . '/public/app/index.html';

        if (!file_exists($indexFile)) {
            return new Response(
                '<h1>Panel Encore Design</h1><p>Build React introuvable. Lancez <code>npm run build</code> dans le dossier frontend/.</p>',
                Response::HTTP_OK,
                ['Content-Type' => 'text/html']
            );
        }

        return new Response(
            file_get_contents($indexFile),
            Response::HTTP_OK,
            ['Content-Type' => 'text/html; charset=UTF-8']
        );
    }
}
