using Messenger.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;
using System.Threading.Tasks;

namespace Messenger.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly MessengerContext _context;
        private readonly string _uploadPath;

        public ProfileController(MessengerContext context)
        {
            _context = context;
            _uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Banners");
            if (!Directory.Exists(_uploadPath))
            {
                Directory.CreateDirectory(_uploadPath);
            }
        }

        [HttpGet("{userId}/profile")]
        public async Task<ActionResult<object>> GetUserProfile(int userId)
        {
            var profile = await _context.UserProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound();
                }

                return Ok(new
                {
                    UserId = userId,
                    AvatarColor = profile.AvatarColor ?? "#5865F2",
                    Avatar = (string?)null,
                    Description = (string?)null,
                    Banner = (string?)null,
                    CreatedAt = user.CreatedAt
                });
            }

            return Ok(new
            {
                UserId = profile.UserId,
                Avatar = profile.Avatar,
                AvatarColor = profile.AvatarColor ?? "#5865F2",
                Description = profile.Description,
                Banner = profile.Banner,
                CreatedAt = profile.User.CreatedAt
            });
        }

        [HttpPost("update-banner")]
        public async Task<IActionResult> UpdateBanner([FromBody] UpdateBannerModel model)
        {
            var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == model.UserId);
            if (profile == null)
            {
                profile = new UserProfile { UserId = model.UserId };
                _context.UserProfiles.Add(profile);
            }

            profile.Banner = model.Banner;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                UserId = profile.UserId,
                Banner = profile.Banner
            });
        }

        [HttpPost("upload/banner")]
        public async Task<IActionResult> UploadBanner(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            var uniqueFileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(_uploadPath, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new { url = $"/uploads/banners/{uniqueFileName}" });
        }

        [HttpPost("update-avatar")]
        public async Task<IActionResult> UpdateAvatar([FromBody] UpdateAvatarModel model)
        {
            var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == model.UserId);
            if (profile == null)
            {
                profile = new UserProfile { UserId = model.UserId };
                _context.UserProfiles.Add(profile);
            }

            profile.Avatar = model.Avatar;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                UserId = profile.UserId,
                Avatar = profile.Avatar
            });
        }

        [HttpPost("upload/avatar")]
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded");

            var uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Avatars");
            if (!Directory.Exists(uploadPath))
            {
                Directory.CreateDirectory(uploadPath);
            }

            var uniqueFileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
            var filePath = Path.Combine(uploadPath, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new { url = $"/Uploads/Avatars/{uniqueFileName}" });
        }

        public class UpdateAvatarModel
        {
            public int UserId { get; set; }
            public string Avatar { get; set; }
        }

        public class UpdateBannerModel
        {
            public int UserId { get; set; }
            public string Banner { get; set; }
        }
    }
}