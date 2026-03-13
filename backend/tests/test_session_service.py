import sys
import uuid

from backend.services.session_service import (
    create_session,
    append_image,
    finalise_session,
    list_sessions,
    get_session,
)


def run_tests():
    user_id = f"test-user-{uuid.uuid4().hex[:8]}"
    session_id = str(uuid.uuid4())
    passed = 0
    failed = 0

    print(f"\nRunning session service integration tests")
    print(f"user_id:    {user_id}")
    print(f"session_id: {session_id}")
    print("-" * 50)

    # Test 1: create_session
    try:
        create_session(user_id, session_id, mode="moment", style="watercolor")
        fetched = get_session(user_id, session_id)
        assert fetched is not None, "session.json not found in GCS after create"
        assert fetched["session_id"] == session_id
        assert fetched["status"] == "active"
        print("PASS  create_session — session.json exists in GCS")
        passed += 1
    except Exception as e:
        print(f"FAIL  create_session — {e}")
        failed += 1

    # Test 2: append_image
    try:
        append_image(
            user_id, session_id,
            image_url="https://example.com/image.png",
            description="A warm orange glow over still water",
            index=0,
        )
        fetched = get_session(user_id, session_id)
        assert len(fetched["images"]) == 1
        assert fetched["images"][0]["index"] == 0
        print("PASS  append_image — image entry appears in session.json")
        passed += 1
    except Exception as e:
        print(f"FAIL  append_image — {e}")
        failed += 1

    # Test 3: finalise_session
    try:
        finalise_session(user_id, session_id, transcript="User spoke about a memory near the lake.")
        fetched = get_session(user_id, session_id)
        assert fetched["status"] == "complete"
        assert fetched["transcript"] is not None
        print("PASS  finalise_session — transcript written, status is complete")
        passed += 1
    except Exception as e:
        print(f"FAIL  finalise_session — {e}")
        failed += 1

    # Test 4: list_sessions
    try:
        sessions = list_sessions(user_id)
        ids = [s["session_id"] for s in sessions]
        assert session_id in ids
        print("PASS  list_sessions — session appears in list")
        passed += 1
    except Exception as e:
        print(f"FAIL  list_sessions — {e}")
        failed += 1

    # Test 5: get_session
    try:
        full = get_session(user_id, session_id)
        assert full["user_id"] == user_id
        assert full["session_id"] == session_id
        assert full["mode"] == "moment"
        assert full["style"] == "watercolor"
        print("PASS  get_session — full object returned correctly")
        passed += 1
    except Exception as e:
        print(f"FAIL  get_session — {e}")
        failed += 1

    print("-" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    return failed


if __name__ == "__main__":
    failures = run_tests()
    sys.exit(failures)
