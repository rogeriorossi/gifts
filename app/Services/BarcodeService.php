<?php

namespace App\Services;

class BarcodeService
{
    /**
     * Generate an EAN-13 barcode given a numeric ID or sequential number.
     * Prefix: 20 (standard internal use prefix)
     */
    public static function generateEAN13(int|string $id): string
    {
        // 2 digits prefix + 10 digits padded ID = 12 digits total
        $prefix = '20';
        $paddedId = str_pad((string)$id, 10, '0', STR_PAD_LEFT);
        $first12 = $prefix . $paddedId;

        return $first12 . self::calculateChecksum($first12);
    }

    /**
     * Calculate EAN-13 checksum digit for a 12-digit string.
     */
    public static function calculateChecksum(string $first12): int
    {
        if (strlen($first12) !== 12) {
            throw new \InvalidArgumentException('First part of EAN-13 must be exactly 12 digits.');
        }

        $sumOdd = 0;
        $sumEven = 0;

        for ($i = 0; $i < 12; $i++) {
            $digit = (int)$first12[$i];
            // 1-indexed position: $i + 1
            if (($i + 1) % 2 !== 0) {
                $sumOdd += $digit;
            } else {
                $sumEven += $digit;
            }
        }

        $totalSum = $sumOdd + ($sumEven * 3);
        $remainder = $totalSum % 10;

        return ($remainder === 0) ? 0 : (10 - $remainder);
    }
}
