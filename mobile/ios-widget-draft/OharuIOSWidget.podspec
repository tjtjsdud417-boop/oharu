Pod::Spec.new do |s|
  s.name = 'OharuIOSWidget'
  s.version = '0.0.0-draft'
  s.summary = 'Disabled Oharu WidgetKit snapshot bridge draft'
  s.description = 'Source-only until provisioned App Group and extension integration are reviewed.'
  s.license = { :type => 'UNLICENSED' }
  s.author = 'moodweb'
  s.homepage = 'https://oharu.today'
  s.platform = :ios, '16.4'
  s.swift_version = '5.0'
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = 'swift/OharuWidgetModule.swift', 'swift/OharuWidgetSnapshot.swift'
  s.frameworks = 'WidgetKit'
end
