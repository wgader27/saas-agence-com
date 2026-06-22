<?php

namespace App\Service;

class WhoisService
{
    /**
     * Fetches domain info via RDAP (Registration Data Access Protocol).
     * Returns ['registrar' => ..., 'expiration' => DateTimeImmutable|null]
     */
    public function lookup(string $domain): array
    {
        $domain = strtolower(preg_replace('#^https?://#', '', $domain));
        $domain = explode('/', $domain)[0];
        $domain = explode(':', $domain)[0];

        $result = ['registrar' => null, 'expiration' => null, 'nameservers' => []];

        try {
            // Try RDAP
            $url     = 'https://rdap.org/domain/' . urlencode($domain);
            $context = stream_context_create([
                'http' => [
                    'timeout'       => 8,
                    'ignore_errors' => true,
                    'header'        => "Accept: application/rdap+json\r\n",
                    'user_agent'    => 'Encore-Design-Panel/1.0',
                ],
                'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
            ]);

            $raw = @file_get_contents($url, false, $context);
            if ($raw === false) return $result;

            $data = json_decode($raw, true);
            if (!is_array($data)) return $result;

            // Extract registrar
            foreach ($data['entities'] ?? [] as $entity) {
                $roles = $entity['roles'] ?? [];
                if (in_array('registrar', $roles)) {
                    $vcardArray = $entity['vcardArray'] ?? [];
                    foreach ($vcardArray[1] ?? [] as $prop) {
                        if (($prop[0] ?? '') === 'fn') {
                            $result['registrar'] = $prop[3] ?? null;
                            break;
                        }
                    }
                    if (!$result['registrar'] && isset($entity['handle'])) {
                        $result['registrar'] = $entity['handle'];
                    }
                }
            }

            // Extract expiration
            foreach ($data['events'] ?? [] as $event) {
                if (($event['eventAction'] ?? '') === 'expiration') {
                    try {
                        $result['expiration'] = new \DateTimeImmutable($event['eventDate']);
                    } catch (\Exception) {}
                }
            }

            // Extract nameservers
            foreach ($data['nameservers'] ?? [] as $ns) {
                if (isset($ns['ldhName'])) $result['nameservers'][] = strtolower($ns['ldhName']);
            }

        } catch (\Throwable) {}

        return $result;
    }
}
