<?php

namespace App\Controller\Api;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/uploads')]
class UploadController extends AbstractController
{
    #[Route('/{filename}', name: 'api_uploads_serve', methods: ['GET'], requirements: ['filename' => '.+'])]
    public function serve(string $filename): Response
    {
        // Sanitize: only allow alphanumeric + dash + dot
        if (!preg_match('/^[a-f0-9]{32}\.[a-z0-9]{2,10}$/i', $filename)) {
            return new Response('Not found', 404);
        }

        $path = $this->getParameter('kernel.project_dir') . '/var/uploads/' . $filename;
        if (!file_exists($path)) {
            return new Response('Not found', 404);
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Cache-Control', 'public, max-age=86400');
        $response->headers->set('Content-Disposition', 'inline');
        return $response;
    }
}
