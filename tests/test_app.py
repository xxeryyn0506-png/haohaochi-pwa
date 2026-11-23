"""Local end-to-end tests; run with: python -m unittest discover -s tests -v"""
from __future__ import annotations
import contextlib
import base64
import http.server
import os
from pathlib import Path
import socketserver
import threading
import shutil
import unittest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address=True

class TestHaohaochi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.chdir(ROOT)
        cls.server=ThreadedTCPServer(('127.0.0.1',0),QuietHandler)
        cls.port=cls.server.server_address[1]
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.playwright=sync_playwright().start()
        cls.browser=cls.playwright.chromium.launch(headless=True,**({'executable_path': shutil.which('chromium')} if shutil.which('chromium') else {}))
        cls.context=cls.browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
        cls.page=cls.context.new_page()
        cls.page.goto(f'http://127.0.0.1:{cls.port}',wait_until='networkidle')
    @classmethod
    def tearDownClass(cls):
        cls.context.close();cls.browser.close();cls.playwright.stop();cls.server.shutdown();cls.server.server_close()

    def test_01_start_and_add(self):
        p=self.page
        self.assertIn('好好吃',p.title())
        p.get_by_role('button',name='添加第一条收藏').click()
        p.locator('input[name="title"]').fill('黑椒蘑菇意面')
        p.locator('select[name="category"]').select_option('主食')
        p.locator('select[name="status"]').select_option('want_to_make')
        p.locator('textarea[name="notes"]').fill('下次多放一点黑胡椒')
        p.locator('#photo-input').set_input_files({
            'name':'dish.png','mimeType':'image/png',
            'buffer':base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=')
        })
        p.locator('#photo-preview img').wait_for()
        p.get_by_role('button',name='保存收藏').click()
        p.locator('.food-card').first.wait_for()
        self.assertIn('黑椒蘑菇意面',p.locator('.food-card').first.inner_text())

    def test_02_search_filter_and_persistence(self):
        p=self.page
        p.locator('#search-input').fill('不存在的菜')
        self.assertEqual(p.locator('.food-card').count(),0)
        p.locator('#search-input').fill('黑椒')
        self.assertEqual(p.locator('.food-card').count(),1)
        p.get_by_role('button',name='甜品',exact=True).click()
        self.assertEqual(p.locator('.food-card').count(),0)
        p.get_by_role('button',name='全部',exact=True).click()
        p.reload(wait_until='networkidle')
        self.assertEqual(p.locator('.food-card').count(),1)
        self.assertTrue(p.locator('.food-card img').count() or p.locator('.food-card .placeholder').count())

    def test_03_detail_edit(self):
        p=self.page
        p.locator('.food-card').first.click()
        self.assertIn('下次多放一点黑胡椒',p.locator('.detail-copy').inner_text())
        p.locator('.detail-cover img').wait_for()
        p.get_by_role('button',name='编辑这条').click()
        p.locator('select[name="status"]').select_option('made')
        p.locator('input[name="source_url"]').fill('https://example.com/recipe')
        p.get_by_role('button',name='保存收藏').click()
        p.locator('.food-card').first.click()
        self.assertIn('做过',p.locator('.detail-copy').inner_text())
        self.assertEqual(p.locator('a.source-link').get_attribute('href'),'https://example.com/recipe')
        p.get_by_role('button',name='返回首页').click()

    def test_04_backup_and_delete(self):
        p=self.page
        p.get_by_role('button',name='打开设置').click()
        with p.expect_download() as download_info:
            p.get_by_role('button',name='导出完整备份（含照片）').click()
        download=download_info.value
        self.assertTrue(download.suggested_filename.endswith('.json'))
        saved=ROOT/'tests'/'_tmp_backup.json'
        download.save_as(saved)
        self.assertIn('haohaochi-backup-v1',saved.read_text())
        p.get_by_role('button',name='关闭').click()
        p.locator('.food-card').first.click()
        p.once('dialog',lambda d:d.accept())
        p.get_by_role('button',name='删除',exact=True).click()
        self.assertEqual(p.locator('.food-card').count(),0)
        p.get_by_role('button',name='打开设置').click()
        p.once('dialog',lambda d:d.accept())
        p.locator('#backup-input').set_input_files(str(saved))
        p.locator('.settings-panel').wait_for(state='detached')
        self.assertEqual(p.locator('.food-card').count(),1)
        saved.unlink(missing_ok=True)

if __name__=='__main__': unittest.main()
