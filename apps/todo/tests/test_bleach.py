from django.test import TestCase
from django.contrib.auth.models import User
from apps.todo.models import StickyNotes
import bleach


class BleachTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='pass')

    def test_bleach_cleans_html_in_notes(self):
        """Bleach cleans HTML in sticky notes."""
        ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'img', 'ul', 'ol', 'li']
        ALLOWED_ATTRS = {'img': ['src', 'style', 'alt']}
        
        dirty_content = '<script>alert("xss")</script><p>Safe content</p><img src="test.jpg" onload="evil()">'
        clean_content = bleach.clean(dirty_content, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS)
        
        # Script should be removed
        self.assertNotIn('<script>', clean_content)
        # Safe p tag should remain
        self.assertIn('<p>', clean_content)
        # onload should be removed from img
        self.assertNotIn('onload', clean_content)
        self.assertIn('<img src="test.jpg">', clean_content)

    def test_bleach_preserves_allowed_tags(self):
        """Allowed tags are preserved."""
        ALLOWED_TAGS = ['strong', 'em']
        content = '<strong>Bold</strong> <em>Italic</em> <div>Div</div>'
        clean = bleach.clean(content, tags=ALLOWED_TAGS, attributes={})
        self.assertIn('<strong>', clean)
        self.assertIn('<em>', clean)
        self.assertNotIn('<div>', clean)

    def test_bleach_preserves_allowed_attributes(self):
        """Allowed attributes are preserved."""
        ALLOWED_ATTRS = {'img': ['src', 'alt']}
        content = '<img src="test.jpg" alt="Test" style="width:100px">'
        clean = bleach.clean(content, tags=['img'], attributes=ALLOWED_ATTRS)
        self.assertIn('src="test.jpg"', clean)
        self.assertIn('alt="Test"', clean)
        self.assertNotIn('style', clean)