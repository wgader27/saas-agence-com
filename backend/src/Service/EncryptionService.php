<?php

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Chiffrement symétrique des données sensibles via libsodium.
 * La clé doit être définie dans APP_ENCRYPTION_KEY (hex 64 chars = 32 bytes).
 */
class EncryptionService
{
    private string $key;

    public function __construct(
        #[Autowire('%env(APP_ENCRYPTION_KEY)%')]
        string $encryptionKey
    ) {
        $this->key = sodium_hex2bin($encryptionKey);

        if (strlen($this->key) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) {
            throw new \RuntimeException('APP_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).');
        }
    }

    public function encrypt(string $plaintext): string
    {
        $nonce      = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $ciphertext = sodium_crypto_secretbox($plaintext, $nonce, $this->key);

        return sodium_bin2hex($nonce . $ciphertext);
    }

    public function decrypt(string $encrypted): string
    {
        $decoded    = sodium_hex2bin($encrypted);
        $nonce      = substr($decoded, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $ciphertext = substr($decoded, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);

        $plaintext  = sodium_crypto_secretbox_open($ciphertext, $nonce, $this->key);

        if ($plaintext === false) {
            throw new \RuntimeException('Decryption failed. Data may be corrupted or key is wrong.');
        }

        return $plaintext;
    }
}
