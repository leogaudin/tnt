**AI-generated**

# Test CSV Fixtures

Test files for manually uploading to the live website to verify CSV import behavior.

## `distribution_test.csv` — Distribution List Upload

| Row | School Code | What it tests |
|-----|-------------|---------------|
| 1 | SPR001 | ✅ Valid — all fields, Paris coordinates |
| 2 | SHE002 | ✅ Valid — negative longitude |
| 3 | CAP003 | ✅ Valid — New York coordinates |
| 4 | RUR004 | ✅ Valid — optional fields (division, zone, htName, htPhone) left empty |
| 5 | COA005 | ✅ Valid — southern hemisphere (Sydney) |
| 6 | MOU006 | ✅ Valid — Tokyo coordinates |
| 7 | EQU007 | ✅ Valid — near equator (Kampala) |
| 8 | — | ❌ Missing required fields (district, school empty) — should show error |
| 9 | NOC009 | ❌ Missing coordinates — should show error |
| 10 | BAD010 | ❌ Non-numeric coordinates (`not_a_number`) — should show error |
| 11 | COM011 | ⚠️ Comma decimal separators (`48,8566`) — should parse correctly |
| 12 | SOU012 | ✅ Valid — southern hemisphere (Rio de Janeiro) |

**Extra columns:** `books` and `pens` are content columns — should be imported as box content.

**Expected result:** 9 boxes created successfully, 3 rows rejected with clear error messages.

## `gps_update_test.csv` — GPS Coordinates Update

| Row | School Code | What it tests |
|-----|-------------|---------------|
| 1 | SPR001 | ✅ Valid update |
| 2 | SHE002 | ✅ Valid update |
| 3 | CAP003 | ✅ Valid — negative longitude |
| 4 | RUR004 | ✅ Valid — London coordinates |
| 5 | COA005 | ✅ Valid — southern hemisphere |
| 6 | MOU006 | ✅ Valid — Tokyo |
| 7 | EQU007 | ✅ Valid — near equator |
| 8 | (empty) | ❌ Missing schoolCode — should show error |
| 9 | BAD010 | ❌ Non-numeric coordinates — should show error |
| 10 | NOC009 | ❌ Missing coordinates — should show error |

**Expected result:** 7 updates applied, 3 rows rejected.