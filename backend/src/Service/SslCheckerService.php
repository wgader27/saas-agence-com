<?php

namespace App\Service;

class SslCheckerService
{
    /**
     * Returns the SSL expiry date of a domain, or null on failure.
     */
    public function getExpiryDate(string $domain): ?\DateTimeImmutable
    {
        $domain = preg_replace('#^https?://#', '', $domain);
        $domain = explode('/', $domain)[0];

        $context = stream_context_create([
            'ssl' => [
                'capture_peer_cert' => true,
                'verify_peer'       => false,
                'verify_peer_name'  => false,
            ],
        ]);

        $socket = @stream_socket_client(
            "ssl://{$domain}:443",
            $errno,
            $errstr,
            5,
            STREAM_CLIENT_CONNECT,
            $context
        );

        if (!$socket) {
            return null;
        }

        $params = stream_context_get_params($socket);
        fclose($socket);

        $cert = $params['options']['ssl']['peer_certificate'] ?? null;
        if (!$cert) {
            return null;
        }

        $certInfo = openssl_x509_parse($cert);
        $validTo  = $certInfo['validTo_time_t'] ?? null;

        if (!$validTo) {
            return null;
        }

        return (new \DateTimeImmutable())->setTimestamp($validTo);
    }
}
