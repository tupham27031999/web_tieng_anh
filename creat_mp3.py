from gtts import gTTS
import os

def text_to_mp3(text: str, output_filename: str = "output.mp3"):
    """
    Chuyển đổi chuỗi văn bản tiếng Anh thành file âm thanh MP3.
    
    :param text: Chuỗi văn bản tiếng Anh cần đọc.
    :param output_filename: Tên file MP3 đầu ra (mặc định là 'output.mp3').
    """
    try:
        # Khởi tạo gTTS với ngôn ngữ tiếng Anh ('en')
        # Nếu muốn đọc chậm hơn, bạn có thể thêm tham số slow=True
        tts = gTTS(text=text, lang='en', slow=False)
        
        # Lưu kết quả thành file MP3
        tts.save(output_filename)
        
        print(f"Thành công! File MP3 đã được lưu tại: {os.path.abspath(output_filename)}")
    except Exception as e:
        print(f"Đã xảy ra lỗi trong quá trình chuyển đổi: {e}")

# # --- Ví dụ sử dụng ---
# text_input = "Transport"
# text_to_mp3(text_input, "Transport.mp3")