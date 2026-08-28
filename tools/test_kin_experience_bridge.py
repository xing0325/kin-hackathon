import unittest
from kin_experience_bridge import compile_candidates


class BridgeTest(unittest.TestCase):
    def test_compiles_summary_without_raw_container(self):
        result = compile_candidates({
            "format": "kin-conversation-export", "generatedAt": "2026-08-28T00:00:00Z",
            "conversations": [{"id": "conv-1", "source": "chatgpt", "title": "BLE", "url": "secret-url", "messages": [
                {"role": "user", "content": "BLE 为什么断连？"},
                {"role": "assistant", "content": "降低遥测频率。"},
            ]}],
        })
        self.assertEqual(len(result), 1)
        encoded = str(result[0])
        self.assertNotIn("messages", encoded)
        self.assertNotIn("secret-url", encoded)
        self.assertEqual(result[0]["artifact"]["visibility"], "private")


if __name__ == "__main__":
    unittest.main()
